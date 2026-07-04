import { useEffect, useRef, useCallback } from 'react';

export function useAutoSave(
  saveFn: () => Promise<void>,
  isDirty: boolean,
  intervalMs: number = 30000
) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSavingRef = useRef(false);

  const triggerSave = useCallback(async () => {
    if (isSavingRef.current || !isDirty) return;
    isSavingRef.current = true;
    try {
      await saveFn();
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFn, isDirty]);

  useEffect(() => {
    if (intervalMs > 0) {
      timerRef.current = setInterval(triggerSave, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [triggerSave, intervalMs]);

  const saveNow = useCallback(async () => {
    await triggerSave();
  }, [triggerSave]);

  return { saveNow };
}
