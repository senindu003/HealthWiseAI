"""Deterministic Stage 4 safety gate.

The evaluator reads only the locally reviewed SafetyRule registry and explicit,
machine-readable user confirmations. It never calls an LLM, Neo4j, a search
tool, or a clinical-evidence retrieval workflow.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.config import BASE_DIR
from app.knowledge_graph.safety_rules import SafetyCriterion, SafetyRule, SafetyRuleRegistry
from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.symptom_chat import SafetyConfirmationOption, SafetyConfirmationQuestion


REGISTRY_PATH = BASE_DIR.parent / "knowledge-sources" / "wave1" / "safety-rule-registry.wave1.json"


class SafetyRegistryConfigurationError(RuntimeError):
    """The server cannot safely evaluate rules if the reviewed registry is invalid."""


@dataclass(frozen=True)
class MatchedSafetyRule:
    safety_rule_id: str
    title: str
    level: str
    action: str
    message: str
    citation_refs: tuple[str, ...]


@dataclass(frozen=True)
class SafetyEvaluationResult:
    blocked: bool
    matched_rules: tuple[MatchedSafetyRule, ...] = ()

    def as_api_detail(self) -> dict[str, object]:
        """Return a small frontend-safe payload with no raw questionnaire data."""

        if not self.blocked:
            return {"code": "SAFETY_CLEAR", "blocked": False, "matches": []}
        highest = sorted(
            self.matched_rules,
            key=lambda item: (0 if item.level == "emergency_now" else 1, item.safety_rule_id),
        )[0]
        return {
            "code": "SAFETY_RULE_MATCHED",
            "blocked": True,
            "level": highest.level,
            "action": highest.action,
            "message": highest.message,
            "matches": [
                {
                    "safetyRuleId": item.safety_rule_id,
                    "title": item.title,
                    "level": item.level,
                    "citationRefs": list(item.citation_refs),
                }
                for item in self.matched_rules
            ],
        }


class SafetyRuleMatched(ValueError):
    """Raised before Stage 4 generation when a reviewed deterministic rule matches."""

    def __init__(self, result: SafetyEvaluationResult) -> None:
        self.result = result
        super().__init__("Safety check: confirmed symptoms require the recommended in-person assessment.")


class SafetyRuleEvaluator:
    """Evaluate only approved, runtime-eligible rules in deterministic order."""

    def __init__(self, registry_path: Path = REGISTRY_PATH) -> None:
        try:
            registry = SafetyRuleRegistry.model_validate_json(registry_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as exc:
            raise SafetyRegistryConfigurationError("Safety-rule registry could not be loaded safely.") from exc
        self._registry = registry
        self._validate_capture_configuration()

    def _validate_capture_configuration(self) -> None:
        """Fail startup if an active rule cannot be fully confirmed by the UI."""

        active_rules = {
            rule.safety_rule_id: rule
            for rule in self._registry.rules
            if rule.status == "approved" and rule.runtime_eligible
        }
        configured_ids = set(_SAFETY_CAPTURE_CONFIG)
        if configured_ids != set(active_rules):
            missing = sorted(set(active_rules) - configured_ids)
            extra = sorted(configured_ids - set(active_rules))
            raise SafetyRegistryConfigurationError(
                f"Safety fact-capture configuration does not match approved rules; missing={missing}, extra={extra}."
            )
        for rule_id, rule in active_rules.items():
            configured_questions = [
                _SAFETY_QUESTIONS[question_id]
                for question_id in _SAFETY_CAPTURE_CONFIG[rule_id]["questionIds"]
            ]
            configured_fact_ids = {question.fact_id for question in configured_questions}
            required_fact_ids = {
                criterion.fact_ref.rsplit(".", maxsplit=1)[-1]
                for alternative in rule.trigger_alternatives
                for criterion in alternative.all_of
            }
            missing_facts = required_fact_ids - configured_fact_ids
            if missing_facts:
                raise SafetyRegistryConfigurationError(
                    f"{rule_id} has no confirmation question for: {sorted(missing_facts)}"
                )

    def evaluate(self, questionnaire: QuestionnaireRequest) -> SafetyEvaluationResult:
        facts = questionnaire.stage3.finalized_symptom_facts
        matches: list[MatchedSafetyRule] = []
        for rule in self._registry.rules:
            if not (rule.status == "approved" and rule.runtime_eligible):
                continue
            if not self._rule_applies(rule, questionnaire):
                continue
            if any(self._alternative_matches(alternative.all_of, facts) for alternative in rule.trigger_alternatives):
                matches.append(self._to_match(rule))
        return SafetyEvaluationResult(blocked=bool(matches), matched_rules=tuple(matches))

    def build_confirmation_plan(
        self,
        questionnaire: QuestionnaireRequest,
        transcript: str,
    ) -> list[SafetyConfirmationQuestion]:
        """Return only relevant confirmations for approved runtime rules.

        Relevance is a conservative keyword screen, never a clinical judgement.
        The user must explicitly answer every returned question before facts are
        created; an unmatched screen creates no fact and no safety conclusion.
        """

        text = " ".join(transcript.lower().split())
        question_ids: list[str] = []
        for rule in self._registry.rules:
            if not (rule.status == "approved" and rule.runtime_eligible):
                continue
            if not self._rule_applies(rule, questionnaire):
                continue
            config = _SAFETY_CAPTURE_CONFIG.get(rule.safety_rule_id)
            if config and any(keyword in text for keyword in config["keywords"]):
                question_ids.extend(config["questionIds"])
        seen: set[str] = set()
        return [
            _SAFETY_QUESTIONS[question_id]
            for question_id in question_ids
            if not (question_id in seen or seen.add(question_id))
        ]

    @staticmethod
    def _rule_applies(rule: SafetyRule, questionnaire: QuestionnaireRequest) -> bool:
        """Respect a rule's reviewed population scope before matching facts."""

        age = questionnaire.stage1.age
        if rule.applies_to == "adults_16_and_over":
            return age >= 16
        if rule.applies_to == "children_under_5":
            return age < 5
        # Pregnancy-specific rules also require a pregnancy confirmation in their
        # trigger criteria, including where Stage 1 is marked "unsure" or the
        # user reports a recent pregnancy in Stage 3.
        return True

    @staticmethod
    def _alternative_matches(criteria: list[SafetyCriterion], facts: dict[str, object]) -> bool:
        return all(SafetyRuleEvaluator._criterion_matches(criterion, facts) for criterion in criteria)

    @staticmethod
    def _criterion_matches(criterion: SafetyCriterion, facts: dict[str, object]) -> bool:
        fact_id = criterion.fact_ref.rsplit(".", maxsplit=1)[-1]
        fact = facts.get(fact_id)
        # The typed request model guarantees this shape, but the guard keeps the
        # evaluator fail-closed if it is ever called with a non-standard object.
        if fact is None or getattr(fact, "confirmed_by_user", False) is not True:
            return False
        raw_value = getattr(fact, "value", None)
        values = {raw_value} if isinstance(raw_value, str) else set(raw_value or [])
        expected = set(criterion.values)
        if criterion.operator == "equals":
            return len(values) == 1 and bool(values & expected)
        if criterion.operator == "contains_any":
            return bool(values & expected)
        # Pydantic constrains this today; retain a fail-closed guard for future changes.
        return False

    @staticmethod
    def _to_match(rule: SafetyRule) -> MatchedSafetyRule:
        return MatchedSafetyRule(
            safety_rule_id=rule.safety_rule_id,
            title=rule.title,
            level=rule.disposition.level,
            action=rule.disposition.action,
            message=rule.disposition.message,
            citation_refs=tuple(rule.citation_refs),
        )


@lru_cache
def get_safety_rule_evaluator() -> SafetyRuleEvaluator:
    """Load the reviewed registry once for the FastAPI process."""

    return SafetyRuleEvaluator()


_YES_NO_UNKNOWN = [
    SafetyConfirmationOption(label="Yes", value="present"),
    SafetyConfirmationOption(label="No", value="not_present"),
    SafetyConfirmationOption(label="I'm not sure", value="not_sure"),
]


def _question(question_id: str, fact_id: str, question: str, *, multiple: bool = False, options: list[SafetyConfirmationOption] | None = None) -> SafetyConfirmationQuestion:
    return SafetyConfirmationQuestion(
        id=question_id,
        factId=fact_id,
        question=question,
        answerType="multiple_choice" if multiple else "single_choice",
        options=options or _YES_NO_UNKNOWN,
    )


_SAFETY_QUESTIONS = {
    "confirm_sudden_speech_language_change": _question("confirm_sudden_speech_language_change", "speech_or_language_disturbance", "Have you had a sudden new problem speaking, finding words or understanding language?"),
    "confirm_sudden_or_hours_onset": _question("confirm_sudden_or_hours_onset", "onset_timing", "Did this begin suddenly or within a few hours?", options=[SafetyConfirmationOption(label="Yes", value="sudden"), SafetyConfirmationOption(label="No", value="not_present"), SafetyConfirmationOption(label="I'm not sure", value="not_sure")]),
    "confirm_symmetrical_limb_weakness": _question("confirm_symmetrical_limb_weakness", "symmetrical_limb_weakness", "Do you have new weakness affecting both sides of your body or both limbs in a similar way?"),
    "confirm_symmetrical_numbness_weakness_imbalance": _question("confirm_symmetrical_numbness_weakness_imbalance", "symmetrical_numbness_with_weakness_or_imbalance", "Do you have numbness on both sides together with weakness or loss of balance?"),
    "confirm_neurological_progression": _question("confirm_neurological_progression", "progression_timing", "Over what period did these symptoms get worse?", options=[SafetyConfirmationOption(label="Within hours", value="within_hours"), SafetyConfirmationOption(label="Within days", value="within_days"), SafetyConfirmationOption(label="Within four weeks", value="within_four_weeks"), SafetyConfirmationOption(label="I'm not sure", value="not_sure")]),
    "confirm_radiating_low_back_pain": _question("confirm_radiating_low_back_pain", "severe_low_back_pain_radiating_to_leg", "Do you have severe low-back pain that travels into a leg?"),
    "confirm_new_bladder_bowel_sexual_change": _question("confirm_new_bladder_bowel_sexual_change", "new_bladder_bowel_or_sexual_function_disturbance", "Have you developed a new change in bladder, bowel or sexual function?"),
    "confirm_new_perineal_numbness": _question("confirm_new_perineal_numbness", "new_perineal_numbness", "Do you have new numbness around the genitals, buttocks or inner thighs?"),
    "confirm_progressive_limb_or_neck_weakness": _question("confirm_progressive_limb_or_neck_weakness", "progressive_limb_or_neck_weakness", "Is weakness in your limbs or neck getting progressively worse?"),
    "confirm_rest_or_lying_breathlessness": _question("confirm_rest_or_lying_breathlessness", "breathlessness_at_rest_or_lying_flat", "Are you short of breath while resting or when lying flat?"),
    "confirm_current_chest_pain": _question("confirm_current_chest_pain", "current_chest_pain_or_discomfort", "Are you having chest pain, pressure, tightness or discomfort right now?"),
    "confirm_acs_features": _question("confirm_acs_features", "possible_acs_feature", "Do any of these apply to the chest discomfort? Select all that apply.", multiple=True, options=[SafetyConfirmationOption(label="It has lasted more than 15 minutes", value="pain_over_fifteen_minutes"), SafetyConfirmationOption(label="It spreads to my arm, back or jaw", value="pain_in_arm_back_or_jaw"), SafetyConfirmationOption(label="Nausea or vomiting", value="nausea_or_vomiting"), SafetyConfirmationOption(label="Marked sweating", value="marked_sweating"), SafetyConfirmationOption(label="Shortness of breath", value="breathlessness"), SafetyConfirmationOption(label="None of these", value="none_of_these")]),
    "confirm_sudden_hearing_loss": _question("confirm_sudden_hearing_loss", "sudden_hearing_loss", "Did hearing in one or both ears become reduced suddenly, over 3 days or less?"),
    "confirm_recent_sudden_hearing_loss": _question("confirm_recent_sudden_hearing_loss", "hearing_loss_onset_timing", "Did this sudden hearing change start within the past 30 days?", options=[SafetyConfirmationOption(label="Yes", value="within_three_days_and_within_thirty_days"), SafetyConfirmationOption(label="No", value="not_present"), SafetyConfirmationOption(label="I'm not sure", value="not_sure")]),
    "confirm_no_known_ear_explanation": _question("confirm_no_known_ear_explanation", "external_or_middle_ear_explanation", "Is there no known outer- or middle-ear cause, such as wax or a current ear infection, explaining the hearing change?", options=[SafetyConfirmationOption(label="No known explanation", value="not_known_or_not_present"), SafetyConfirmationOption(label="There is a known explanation", value="present"), SafetyConfirmationOption(label="I'm not sure", value="not_sure")]),
    "confirm_anaphylaxis_pattern": _question("confirm_anaphylaxis_pattern", "rapidly_developing_airway_breathing_or_circulation_problem", "Did breathing, throat, voice, swelling, faintness or circulation symptoms develop quickly?"),
    "confirm_recent_allergen_exposure": _question("confirm_recent_allergen_exposure", "possible_recent_allergen_exposure", "Did this begin after a possible food, medicine, insect-sting or other allergen exposure?"),
    "confirm_child_fever": _question("confirm_child_fever", "fever", "Does the child currently have a fever?"),
    "confirm_child_nonblanching_rash": _question("confirm_child_nonblanching_rash", "non_blanching_rash", "Does the child have a rash that does not fade when pressed?"),
    "confirm_pregnancy": _question("confirm_pregnancy", "possible_or_confirmed_pregnancy", "Are you pregnant, might you be pregnant, or have you recently been pregnant?"),
    "confirm_pregnancy_pain_or_bleeding": _question("confirm_pregnancy_pain_or_bleeding", "significant_abdominal_or_pelvic_pain_or_vaginal_bleeding", "Are you having significant abdominal or pelvic pain, or vaginal bleeding?"),
    "confirm_possible_infection": _question("confirm_possible_infection", "possible_infection", "Do you think you may currently have an infection or feel acutely unwell with one?"),
    "confirm_high_risk_infection_feature": _question("confirm_high_risk_infection_feature", "high_risk_infection_feature", "Do any of these apply? Select all that apply.", multiple=True, options=[SafetyConfirmationOption(label="Blue or mottled skin", value="blue_or_mottled_skin"), SafetyConfirmationOption(label="A rash that does not fade when pressed", value="non_blanching_rash"), SafetyConfirmationOption(label="No urine passed for about 18 hours", value="not_passed_urine_for_18_hours"), SafetyConfirmationOption(label="None of these", value="none_of_these")]),
    "confirm_possible_upper_gi_bleeding": _question("confirm_possible_upper_gi_bleeding", "possible_upper_gastrointestinal_bleeding", "Have you vomited blood or noticed black, tarry stool?"),
    "confirm_instability_feature": _question("confirm_instability_feature", "instability_feature", "Do any of these apply now? Select all that apply.", multiple=True, options=[SafetyConfirmationOption(label="Fainting or collapse", value="fainting_or_collapse"), SafetyConfirmationOption(label="Confusion", value="confusion"), SafetyConfirmationOption(label="Marked weakness or dizziness", value="marked_weakness_or_dizziness"), SafetyConfirmationOption(label="None of these", value="none_of_these")]),
    "confirm_type_1_diabetes": _question("confirm_type_1_diabetes", "type_1_diabetes", "Have you been diagnosed with type 1 diabetes?"),
    "confirm_sudden_vision_loss": _question("confirm_sudden_vision_loss", "sudden_vision_loss", "Have you had a sudden loss of vision?"),
    "confirm_self_harm": _question("confirm_self_harm", "self_harm_has_occurred", "Have you harmed yourself or taken something to harm yourself?"),
    "confirm_immediate_safety": _question("confirm_immediate_safety", "immediate_safety_concern", "Do you feel you may be in immediate danger of harming yourself, or unable to stay safe right now?"),
}

_SAFETY_CAPTURE_CONFIG = {
    "adult_sudden_speech_or_language_disturbance": {"keywords": ("speech", "words", "talk", "language", "slurred"), "questionIds": ("confirm_sudden_speech_language_change", "confirm_sudden_or_hours_onset")},
    "adult_rapid_symmetrical_neurological_change": {"keywords": ("weakness", "numb", "numbness", "imbalance", "balance", "walking"), "questionIds": ("confirm_symmetrical_limb_weakness", "confirm_symmetrical_numbness_weakness_imbalance", "confirm_neurological_progression")},
    "adult_back_pain_with_cauda_equina_features": {"keywords": ("back pain", "backache", "leg pain", "bladder", "bowel", "saddle numb"), "questionIds": ("confirm_radiating_low_back_pain", "confirm_new_bladder_bowel_sexual_change", "confirm_new_perineal_numbness")},
    "adult_progressive_weakness_with_rest_breathlessness": {"keywords": ("weakness", "weak", "neck weakness", "breathless", "shortness of breath", "lying flat"), "questionIds": ("confirm_progressive_limb_or_neck_weakness", "confirm_rest_or_lying_breathlessness")},
    "adult_current_chest_pain_with_possible_acs_features": {"keywords": ("chest", "pressure", "tightness", "jaw", "arm pain"), "questionIds": ("confirm_current_chest_pain", "confirm_acs_features")},
    "adult_recent_sudden_hearing_loss": {"keywords": ("hearing", "deaf", "ear hearing"), "questionIds": ("confirm_sudden_hearing_loss", "confirm_recent_sudden_hearing_loss", "confirm_no_known_ear_explanation")},
    "adult_rapidly_developing_anaphylaxis_features": {"keywords": ("allerg", "hives", "swelling", "wheeze", "throat tight"), "questionIds": ("confirm_anaphylaxis_pattern", "confirm_recent_allergen_exposure")},
    "child_under_five_fever_with_non_blanching_rash": {"keywords": ("fever", "rash", "temperature"), "questionIds": ("confirm_child_fever", "confirm_child_nonblanching_rash")},
    "pregnancy_with_significant_pain_or_bleeding": {"keywords": ("pregnan", "vaginal bleeding", "pelvic pain", "missed period"), "questionIds": ("confirm_pregnancy", "confirm_pregnancy_pain_or_bleeding")},
    "adult_possible_infection_with_high_risk_features": {"keywords": ("infection", "fever", "chills", "urine", "mottled"), "questionIds": ("confirm_possible_infection", "confirm_high_risk_infection_feature")},
    "adult_possible_upper_gi_bleeding_with_instability": {"keywords": ("vomit blood", "bloody vomit", "black stool", "tarry stool", "bleeding"), "questionIds": ("confirm_possible_upper_gi_bleeding", "confirm_instability_feature")},
    "adult_type_1_diabetes_with_sudden_vision_loss": {"keywords": ("vision", "sight", "blind", "diabetes"), "questionIds": ("confirm_type_1_diabetes", "confirm_sudden_vision_loss")},
    "self_harm_with_immediate_safety_concern": {"keywords": ("self harm", "suicide", "kill myself", "hurt myself", "cut myself", "overdose"), "questionIds": ("confirm_self_harm", "confirm_immediate_safety")},
}
