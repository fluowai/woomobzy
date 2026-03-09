import React from 'react';
import { FormBlockConfig, FormField } from '../../../types/landingPage';
import { Plus, Trash2 } from 'lucide-react';

interface FormBlockSettingsProps {
  config: FormBlockConfig;
  onUpdate: (config: FormBlockConfig) => void;
}

const FormBlockSettings: React.FC<FormBlockSettingsProps> = ({ config, onUpdate }) => {
  const updateField = (field: keyof FormBlockConfig, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  const addField = () => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      type: 'text',
      label: 'Novo Campo',
      required: false,
      placeholder: ''
    };
    updateField('fields', [...config.fields, newField]);
  };

  const updateFieldConfig = (index: number, updates: Partial<FormField>) => {
    const newFields = [...config.fields];
    newFields[index] = { ...newFields[index], ...updates };
    updateField('fields', newFields);
  };

  const removeField = (index: number) => {
    updateField('fields', config.fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título do Formulário
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Campos</h4>
          <button
            onClick={addField}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {config.fields.map((field, index) => (
            <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Campo {index + 1}</span>
                <button
                  onClick={() => removeField(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => updateFieldConfig(index, { label: e.target.value })}
                  placeholder="Label"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateFieldConfig(index, { name: e.target.value })}
                  placeholder="Nome do campo"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <select
                  value={field.type}
                  onChange={(e) => updateFieldConfig(index, { type: e.target.value as any })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="text">Texto</option>
                  <option value="email">E-mail</option>
                  <option value="tel">Telefone</option>
                  <option value="textarea">Área de Texto</option>
                  <option value="select">Seleção</option>
                </select>

                <input
                  type="text"
                  value={field.placeholder || ''}
                  onChange={(e) => updateFieldConfig(index, { placeholder: e.target.value })}
                  placeholder="Placeholder"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateFieldConfig(index, { required: e.target.checked })}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Campo obrigatório
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Texto do Botão
          </label>
          <input
            type="text"
            value={config.submitText}
            onChange={(e) => updateField('submitText', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mensagem de Sucesso
          </label>
          <textarea
            value={config.successMessage}
            onChange={(e) => updateField('successMessage', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default FormBlockSettings;
