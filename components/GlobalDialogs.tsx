import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, HelpCircle, MessageSquare, X } from 'lucide-react';
import { useDialog } from '@/context/DialogContext';

export function GlobalDialogs() {
  const { activeDialog, closeDialog } = useDialog();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (activeDialog?.type === 'prompt') {
      setInputValue(activeDialog.defaultValue || '');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [activeDialog]);

  if (!activeDialog) return null;

  const { type, title, message, confirmText = 'OK', cancelText = 'Cancelar' } = activeDialog;

  const handleConfirm = () => {
    if (type === 'prompt') {
      closeDialog(inputValue);
    } else if (type === 'confirm') {
      closeDialog(true);
    } else {
      closeDialog(undefined); // alert
    }
  };

  const handleCancel = () => {
    if (type === 'prompt') {
      closeDialog(null);
    } else if (type === 'confirm') {
      closeDialog(false);
    } else {
      closeDialog(undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'alert':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      case 'confirm':
        return <HelpCircle className="w-8 h-8 text-indigo-500" />;
      case 'prompt':
        return <MessageSquare className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex justify-center items-start pt-[20vh] px-4 pointer-events-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
          onClick={handleCancel}
        />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, y: -40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", bounce: 0.4, duration: 0.6 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl rounded-2xl overflow-hidden pointer-events-auto border border-gray-100 dark:border-gray-800"
          onKeyDown={handleKeyDown}
        >
          {/* Close button */}
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-full">
                {getIcon()}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title || (type === 'alert' ? 'Atenção' : type === 'confirm' ? 'Confirmar' : 'Entrada Necessária')}
              </h3>
            </div>

            <p className="text-gray-600 dark:text-gray-300 mb-6 text-base leading-relaxed">
              {message}
            </p>

            {type === 'prompt' && (
              <div className="mb-6">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Digite aqui..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              {type !== 'alert' && (
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  {cancelText}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-lg shadow-indigo-500/30"
              >
                {confirmText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
