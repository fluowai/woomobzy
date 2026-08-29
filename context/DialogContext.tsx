import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type DialogType = 'alert' | 'confirm' | 'prompt';

export interface DialogOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
}

interface ActiveDialog extends DialogOptions {
  id: string;
  type: DialogType;
  resolve: (value: any) => void;
}

interface DialogContextType {
  alert: (options: string | DialogOptions) => Promise<void>;
  confirm: (options: string | DialogOptions) => Promise<boolean>;
  prompt: (options: string | DialogOptions) => Promise<string | null>;
  activeDialog: ActiveDialog | null;
  closeDialog: (result: any) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);

  const openDialog = useCallback((type: DialogType, options: string | DialogOptions): Promise<any> => {
    return new Promise((resolve) => {
      const parsedOptions = typeof options === 'string' ? { message: options } : options;
      
      setActiveDialog({
        id: Math.random().toString(36).substring(7),
        type,
        ...parsedOptions,
        resolve,
      });
    });
  }, []);

  const alert = useCallback((options: string | DialogOptions) => {
    return openDialog('alert', options);
  }, [openDialog]);

  const confirm = useCallback((options: string | DialogOptions) => {
    return openDialog('confirm', options);
  }, [openDialog]);

  const prompt = useCallback((options: string | DialogOptions) => {
    return openDialog('prompt', options);
  }, [openDialog]);

  const closeDialog = useCallback((result: any) => {
    if (activeDialog) {
      activeDialog.resolve(result);
      setActiveDialog(null);
    }
  }, [activeDialog]);

  return (
    <DialogContext.Provider value={{ alert, confirm, prompt, activeDialog, closeDialog }}>
      {children}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
}
