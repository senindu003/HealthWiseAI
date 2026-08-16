"""Stage-specific prompts for the fixed LangGraph workflow."""

from app.llm.prompts import SYSTEM_SAFETY_PROMPT

EVALUATOR_PROMPT = f"""{SYSTEM_SAFETY_PROMPT}

You are the evaluator stage. Analyze the questionnaire below and identify reasonable possible
risk patterns without diagnosing. Produce the initial laboratory test recommendations.
Questionnaire: {{questionnaire}}

JSON schema: {{"summary": "brief non-diagnostic assessment", "recommendations": [{{"test_name": "...", "category": "...", "priority": "high|medium|low", "reason_from_rules": "fact-based rationale", "personalized_explanation": "plain-language explanation"}}]}}"""

CRITIC_PROMPT = f"""{SYSTEM_SAFETY_PROMPT}

You are the critic stage. Review the evaluator output against the questionnaire. Remove tests
without a clear rationale, correct overstatements, and add only important missing laboratory
investigations. Return a revised complete response, not commentary.
Questionnaire: {{questionnaire}}
Evaluator output: {{evaluator_output}}

JSON schema: {{"summary": "brief non-diagnostic assessment", "recommendations": [{{"test_name": "...", "category": "...", "priority": "high|medium|low", "reason_from_rules": "fact-based rationale", "personalized_explanation": "plain-language explanation"}}]}}"""

OPTIMIZER_PROMPT = f"""{SYSTEM_SAFETY_PROMPT}

You are the optimizer stage. Merge the evaluator and critic results into one final response.
Favor the critic's safety corrections. Deduplicate equivalent tests, preserve useful rationale,
and prioritize only according to questionnaire evidence. Return only the fixed JSON response.
Questionnaire: {{questionnaire}}
Evaluator output: {{evaluator_output}}
Critic output: {{critic_output}}

JSON schema: {{"summary": "brief non-diagnostic assessment", "recommendations": [{{"test_name": "...", "category": "...", "priority": "high|medium|low", "reason_from_rules": "fact-based rationale", "personalized_explanation": "plain-language explanation"}}]}}"""
