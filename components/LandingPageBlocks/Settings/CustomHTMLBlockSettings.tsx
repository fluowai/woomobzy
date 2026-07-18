import { logger } from '@/utils/logger';
import React from 'react';
import { CustomHTMLBlockConfig } from '../../../types/landingPage';

interface CustomHTMLBlockSettingsProps {
  config: CustomHTMLBlockConfig;
  onUpdate: (config: CustomHTMLBlockConfig) => void;
}

const CustomHTMLBlockSettings: React.FC<CustomHTMLBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const handleChange = (key: keyof CustomHTMLBlockConfig, value: string) => {
    onUpdate({ ...config, [key]: value });
  };

  const handleEditableFieldChange = (fieldKey: string, value: string) => {
    onUpdate({
      ...config,
      editableFields: (config.editableFields || []).map((field) =>
        field.key === fieldKey ? { ...field, value } : field
      ),
    });
  };

  return (
    <div className="space-y-6">
      {config.editableFields?.length ? (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-indigo-950">
              Edicao rapida do tema
            </h3>
            <p className="mt-1 text-xs leading-5 text-indigo-700">
              Altere os textos principais sem mexer no HTML. As mudancas
              aparecem direto na previa da landing page.
            </p>
          </div>

          <div className="space-y-4">
            {config.editableFields.map((field) => (
              <div key={field.key}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-indigo-900">
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={field.value}
                    onChange={(event) =>
                      handleEditableFieldChange(field.key, event.target.value)
                    }
                    rows={3}
                    className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                ) : (
                  <input
                    type={field.type === 'image' ? 'url' : 'text'}
                    value={field.value}
                    onChange={(event) =>
                      handleEditableFieldChange(field.key, event.target.value)
                    }
                    className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          HTML Content
        </label>
        <textarea
          value={config.html || ''}
          onChange={(e) => handleChange('html', e.target.value)}
          rows={10}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="<div>Seu HTML aqui...</div>"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Internal CSS (Opcional)
        </label>
        <textarea
          value={config.css || ''}
          onChange={(e) => handleChange('css', e.target.value)}
          rows={5}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder=".minha-classe { color: red; }"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Scripts JS (Opcional)
        </label>
        <textarea
          value={config.js || ''}
          onChange={(e) => handleChange('js', e.target.value)}
          rows={5}
          className="w-full p-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="logger.info('Hello from JS');"
        />
        <p className="text-[10px] text-amber-600 mt-1 font-medium">
          ⚠️ Cuidado ao injetar scripts externos.
        </p>
      </div>
    </div>
  );
};

export default CustomHTMLBlockSettings;
