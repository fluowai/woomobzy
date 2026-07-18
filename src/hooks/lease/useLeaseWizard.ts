import { logger } from '@/utils/logger';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { Lease, LeaseWizardState } from '../../types/lease';
import { createLease, updateLease } from '../../services/lease/leaseService';

const STORAGE_KEY = 'lease_wizard_draft';

const initialState: LeaseWizardState = {
  currentStep: 1,
  isDirty: false,
  isSaving: false,
  completedSteps: [],
  errors: {},
};

export function useLeaseWizard(existingLease?: Lease) {
  const [lease, setLease] = useState<Partial<Lease>>(existingLease || {});
  const [wizard, setWizard] = useState<LeaseWizardState>({
    ...initialState,
    leaseId: existingLease?.id,
  });
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDraftRef = useRef(false);

  // Auto-save every 30 seconds if dirty
  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      if (wizard.isDirty && wizard.leaseId) {
        handleSaveDraft();
      }
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [wizard.isDirty, wizard.leaseId, lease]);

  // Restore draft from localStorage on mount (if no existing lease)
  useEffect(() => {
    if (!existingLease) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setLease(parsed.lease);
          setWizard((prev) => ({
            ...prev,
            currentStep: parsed.currentStep || 1,
            completedSteps: parsed.completedSteps || [],
            leaseId: parsed.leaseId,
          }));
        }
      } catch {}
    }
  }, []);

  const updateField = useCallback(<K extends keyof Lease>(key: K, value: Lease[K]) => {
    setLease((prev) => ({ ...prev, [key]: value }));
    setWizard((prev) => ({ ...prev, isDirty: true }));
  }, []);

  const updateFields = useCallback((fields: Partial<Lease>) => {
    setLease((prev) => ({ ...prev, ...fields }));
    setWizard((prev) => ({ ...prev, isDirty: true }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setWizard((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const completeStep = useCallback((step: number) => {
    setWizard((prev) => ({
      ...prev,
      completedSteps: prev.completedSteps.includes(step)
        ? prev.completedSteps
        : [...prev.completedSteps, step],
    }));
  }, []);

  const nextStep = useCallback(() => {
    setWizard((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 11),
    }));
  }, []);

  const prevStep = useCallback(() => {
    setWizard((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1),
    }));
  }, []);

  const handleSaveDraft = useCallback(async () => {
    if (!lease.tenant_name && !wizard.leaseId) return;

    setWizard((prev) => ({ ...prev, isSaving: true }));
    try {
      if (wizard.leaseId) {
        const { data } = await updateLease(wizard.leaseId, lease);
        if (data) setLease(data);
      } else {
        const { data } = await createLease({
          ...lease,
          status: 'draft',
        });
        if (data) {
          setLease(data);
          setWizard((prev) => ({ ...prev, leaseId: data.id }));
        }
      }
      setWizard((prev) => ({
        ...prev,
        isDirty: false,
        isSaving: false,
        lastSavedAt: new Date().toISOString(),
      }));

      // Save to localStorage
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          lease: lease,
          currentStep: wizard.currentStep,
          completedSteps: wizard.completedSteps,
          leaseId: wizard.leaseId,
        })
      );
    } catch (error) {
      logger.error('Auto-save error:', error);
      setWizard((prev) => ({ ...prev, isSaving: false }));
    }
  }, [lease, wizard.leaseId, wizard.currentStep, wizard.completedSteps]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLease({});
    setWizard(initialState);
  }, []);

  return {
    lease,
    wizard,
    updateField,
    updateFields,
    goToStep,
    completeStep,
    nextStep,
    prevStep,
    saveDraft: handleSaveDraft,
    clearDraft,
    setLease,
  };
}
