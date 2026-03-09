
import React from 'react';
import { Block, FormBlockConfig } from '../../../types';

interface FormBlockProps {
  block: Block;
  isEditing?: boolean;
}

export const FormBlock: React.FC<FormBlockProps> = ({ block, isEditing }) => {
  const config = block.config as FormBlockConfig;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      alert('Formulário em modo de edição - não será enviado');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {config.title && (
        <h2 className="text-3xl font-bold text-center mb-8">{config.title}</h2>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {config.fields?.map((field, index) => (
          <div key={index}>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.type === 'textarea' ? (
              <textarea
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                rows={4}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            ) : (
              <input
                type={field.type}
                name={field.name}
                placeholder={field.placeholder}
                required={field.required}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            )}
          </div>
        ))}
        
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-lg transition-colors"
        >
          {config.submitText || 'Enviar'}
        </button>
      </form>
    </div>
  );
};
