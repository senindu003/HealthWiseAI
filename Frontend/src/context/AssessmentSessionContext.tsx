import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { assessmentSessionService } from '../services/assessmentSessionService';
import { useToast } from './ToastContext';
import {
  buildStagePayload,
  EMPTY_ASSESSMENT_DATA,
  STAGE_ROUTES,
  type AssessmentData,
  type AssessmentSessionResponse,
  type SessionStatus,
  type StageType,
} from '../types/assessmentSession';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AssessmentSessionContextValue {
  sessionId: string | null;
  status: SessionStatus | null;
  currentStage: StageType | null;
  assessmentData: AssessmentData;
  isLoading: boolean;
  saveStatus: SaveStatus;
  updateSection: <K extends keyof AssessmentData>(section: K, patch: Partial<AssessmentData[K]>) => void;
  saveStage: (stage: StageType, markComplete: boolean) => Promise<void>;
  saveDraft: (stage: StageType) => Promise<void>;
  completeAssessment: () => Promise<void>;
}

const AssessmentSessionContext = createContext<AssessmentSessionContextValue | null>(null);

export function AssessmentSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const [currentStage, setCurrentStage] = useState<StageType | null>(null);
  const [assessmentData, setAssessmentData] = useState<AssessmentData>(EMPTY_ASSESSMENT_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const hasResumedRef = useRef(false);

  const hydrate = useCallback((session: AssessmentSessionResponse) => {
    setSessionId(session.sessionId);
    setStatus(session.status);
    setCurrentStage(session.currentStage);
    setAssessmentData(session.assessmentData);
  }, []);

  // Resume-on-mount: find the user's IN_PROGRESS session (via the persisted stub userId,
  // see assessmentSessionService.getOrCreateUserId), eagerly creating one if none exists
  // (matches the spec's "User starts assessment -> Create Assessment Session" workflow).
  // Redirects forward once if the resumed session is ahead of the currently rendered route.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let session = await assessmentSessionService.getCurrentSession();
        // Bail out before the (network-side-effecting) create call if this effect run was
        // superseded - e.g. React StrictMode's dev-only double-invoke, which runs mount,
        // cleanup, then mount again in the same tick, setting `cancelled` before this
        // first await resolves. Without this check, both invocations could independently
        // decide no session exists yet and each create one.
        if (cancelled) return;
        if (!session) {
          session = await assessmentSessionService.createSession();
        }
        if (cancelled) return;
        hydrate(session);

        if (!hasResumedRef.current) {
          hasResumedRef.current = true;
          const targetRoute = STAGE_ROUTES[session.currentStage];
          if (session.status === 'IN_PROGRESS' && targetRoute && location.pathname !== targetRoute) {
            navigate(targetRoute, { replace: true });
          }
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally runs once on mount only - re-running on every route change within the
    // wizard would fight the user's own forward/back navigation between stages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSection = useCallback(
    <K extends keyof AssessmentData>(section: K, patch: Partial<AssessmentData[K]>) => {
      setAssessmentData((prev) => ({
        ...prev,
        [section]: { ...prev[section], ...patch },
      }));
    },
    [],
  );

  const saveStage = useCallback(
    async (stage: StageType, markComplete: boolean) => {
      if (!sessionId) return;
      setSaveStatus('saving');
      try {
        const updated = await assessmentSessionService.updateStage(sessionId, {
          stage,
          data: buildStagePayload(stage, assessmentData),
          markStageComplete: markComplete,
        });
        hydrate(updated);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
        showToast('error', 'Could not save this stage. Please check your connection and try again.', {
          label: 'Retry',
          onClick: () => void saveStage(stage, markComplete),
        });
        throw err;
      }
    },
    [sessionId, assessmentData, hydrate, showToast],
  );

  const saveDraft = useCallback(
    async (stage: StageType) => {
      if (!sessionId) return;
      setSaveStatus('saving');
      try {
        const updated = await assessmentSessionService.autoSave(sessionId, {
          stage,
          data: buildStagePayload(stage, assessmentData),
        });
        hydrate(updated);
        setSaveStatus('saved');
        showToast('success', 'Draft saved.');
      } catch (err) {
        setSaveStatus('error');
        showToast('error', 'Could not save your draft. Please check your connection and try again.', {
          label: 'Retry',
          onClick: () => void saveDraft(stage),
        });
        throw err;
      }
    },
    [sessionId, assessmentData, hydrate, showToast],
  );

  const completeAssessment = useCallback(async () => {
    if (!sessionId) return;
    try {
      const updated = await assessmentSessionService.completeSession(sessionId);
      hydrate(updated);
      showToast('success', 'Assessment submitted successfully!');
    } catch (err) {
      showToast('error', 'Could not submit your assessment. Please check your connection and try again.', {
        label: 'Retry',
        onClick: () => void completeAssessment(),
      });
      throw err;
    }
  }, [sessionId, hydrate, showToast]);

  return (
    <AssessmentSessionContext.Provider
      value={{
        sessionId,
        status,
        currentStage,
        assessmentData,
        isLoading,
        saveStatus,
        updateSection,
        saveStage,
        saveDraft,
        completeAssessment,
      }}
    >
      {children}
    </AssessmentSessionContext.Provider>
  );
}

export function useAssessmentSession(): AssessmentSessionContextValue {
  const ctx = useContext(AssessmentSessionContext);
  if (!ctx) {
    throw new Error('useAssessmentSession must be used within an AssessmentSessionProvider');
  }
  return ctx;
}
