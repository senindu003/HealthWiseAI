import { useCallback, useEffect, useRef, useState } from 'react';
import { assessmentSessionService } from '../services/assessmentSessionService';
import { buildStagePayload, type AssessmentData, type StageType } from '../types/assessmentSession';
import { useToast } from '../context/ToastContext';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const DEBOUNCE_MS = 1200;
const SAFETY_NET_INTERVAL_MS = 30000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounced + periodic + tab-hide autosave for one wizard stage. Data loss window is
 * bounded by DEBOUNCE_MS during active typing, and by the visibilitychange listener on
 * tab close/navigation-away. `sendBeacon` isn't used for the unload case because the
 * autosave endpoint is a PUT and sendBeacon only supports POST - `fetch(..., {keepalive:true})`
 * supports PUT and is reliable enough for a small JSON payload.
 *
 * Transient failures are retried with exponential backoff before surfacing an error -
 * only a persistent failure (after MAX_RETRIES) shows a toast with a manual retry action.
 * The keepalive (tab-hide/unload) path never retries or toasts, since the page may
 * already be gone by the time a retry would fire.
 */
export function useAutoSave(sessionId: string | null, stage: StageType, data: AssessmentData) {
  const { showToast } = useToast();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const dataRef = useRef(data);
  const dirtyRef = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    dataRef.current = data;
    dirtyRef.current = true;
  }, [data]);

  const attemptSave = useCallback(
    async (options?: { keepalive?: boolean }): Promise<boolean> => {
      if (!sessionId) return false;
      try {
        await assessmentSessionService.autoSave(
          sessionId,
          { stage, data: buildStagePayload(stage, dataRef.current) },
          options?.keepalive,
        );
        return true;
      } catch {
        return false;
      }
    },
    [sessionId, stage],
  );

  const saveNow = useCallback(
    async (options?: { keepalive?: boolean }): Promise<void> => {
      if (!sessionId || !dirtyRef.current) return;
      dirtyRef.current = false;
      setSaveStatus('saving');

      const maxAttempts = options?.keepalive ? 1 : MAX_RETRIES + 1;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // eslint-disable-next-line no-await-in-loop
        const succeeded = await attemptSave(options);
        if (succeeded) {
          setSaveStatus('saved');
          return;
        }
        if (attempt < maxAttempts - 1) {
          // eslint-disable-next-line no-await-in-loop
          await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
        }
      }

      dirtyRef.current = true;
      setSaveStatus('error');
      if (!options?.keepalive) {
        showToast('error', 'Autosave failed after several attempts. Your changes are kept locally.', {
          label: 'Retry now',
          onClick: () => {
            dirtyRef.current = true;
            void saveNow();
          },
        });
      }
    },
    [sessionId, attemptSave, showToast],
  );

  useEffect(() => {
    if (!sessionId) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      void saveNow();
    }, DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [data, sessionId, saveNow]);

  useEffect(() => {
    if (!sessionId) return;
    const interval = setInterval(() => {
      void saveNow();
    }, SAFETY_NET_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [sessionId, saveNow]);

  useEffect(() => {
    if (!sessionId) return;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void saveNow({ keepalive: true });
    };
    const handleBeforeUnload = () => {
      void saveNow({ keepalive: true });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sessionId, saveNow]);

  return { saveStatus, saveNow: () => saveNow() };
}
