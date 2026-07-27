import React from 'react';
import { HeroWithFormBlockConfig, FormField } from '../../../types/landingPage';
import { Plus, Trash2 } from 'lucide-react';

interface HeroWithFormBlockSettingsProps {
  config: HeroWithFormBlockConfig;
  onUpdate: (config: HeroWithFormBlockConfig) => void;
}

const HeroWithFormBlockSettings: React.FC<HeroWithFormBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const updateField = (field: keyof HeroWithFormBlockConfig, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  const addFormField = () => {
    const newField: FormField = {
      name: `field_${Date.now()}`,
      type: 'text',
      label: 'Novo Campo',
      required: false,
      placeholder: '',
    };
    updateField('fields', [...(config.fields || []), newField]);
  };

  const updateFormFieldConfig = (
    index: number,
    updates: Partial<FormField>
  ) => {
    const newFields = [...(config.fields || [])];
    newFields[index] = { ...newFields[index], ...updates };
    updateField('fields', newFields);
  };

  const removeFormField = (index: number) => {
    updateField(
      'fields',
      (config.fields || []).filter((_, i) => i !== index)
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título Hero
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateField('title', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subtítulo Hero
        </label>
        <textarea
          value={config.subtitle || ''}
          onChange={(e) => updateField('subtitle', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem de Fundo (URL)
        </label>
        <input
          type="url"
          value={config.backgroundImage}
          onChange={(e) => updateField('backgroundImage', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título do Formulário
        </label>
        <input
          type="text"
          value={config.formTitle}
          onChange={(e) => updateField('formTitle', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Texto do Botão
        </label>
        <input
          type="text"
          value={config.submitText}
          onChange={(e) => updateField('submitText', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">
            Campos do Formulário
          </h4>
          <button
            onClick={addFormField}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            Adicionar
          </button>
        </div>

        <div className="space-y-3">
          {(config.fields || []).map((field, index) => (
            <div
              key={index}
              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Campo {index + 1}
                </span>
                <button
                  onClick={() => removeFormField(index)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) =>
                    updateFormFieldConfig(index, { label: e.target.value })
                  }
                  placeholder="Label"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <input
                  type="text"
                  value={field.name}
                  onChange={(e) =>
                    updateFormFieldConfig(index, { name: e.target.value })
                  }
                  placeholder="Nome do campo (ex: email)"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <select
                  value={field.type}
                  onChange={(e) =>
                    updateFormFieldConfig(index, {
                      type: e.target.value as any,
                    })
                  }
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
                  onChange={(e) =>
                    updateFormFieldConfig(index, {
                      placeholder: e.target.value,
                    })
                  }
                  placeholder="Placeholder"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />

                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) =>
                      updateFormFieldConfig(index, {
                        required: e.target.checked,
                      })
                    }
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  Campo obrigatório
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Guia/Especialista (URL)
        </label>
        <input
          type="url"
          value={config.guideImageUrl || ''}
          onChange={(e) => updateField('guideImageUrl', e.target.value)}
          placeholder="https://exemplo.com/guia.png"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showBadges"
          checked={config.showBadges}
          onChange={(e) => updateField('showBadges', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label
          htmlFor="showBadges"
          className="text-sm font-medium text-gray-700"
        >
          Mostrar Selos de Confiança
        </label>
      </div>
    </div>
  );
};

export default HeroWithFormBlockSettings;
