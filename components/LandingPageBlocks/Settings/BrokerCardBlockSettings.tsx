import React from 'react';

interface BrokerCardBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const BrokerCardBlockSettings: React.FC<BrokerCardBlockSettingsProps> = ({
  config,
  onUpdate,
}) => {
  const updateField = (field: string, value: any) => {
    onUpdate({ ...config, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nome
        </label>
        <input
          type="text"
          value={config.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Nome do corretor"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          URL da Foto
        </label>
        <input
          type="url"
          value={config.photoUrl || config.photo || ''}
          onChange={(e) => {
            updateField('photoUrl', e.target.value);
            updateField('photo', e.target.value);
          }}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          CRECI
        </label>
        <input
          type="text"
          value={config.creci || ''}
          onChange={(e) => updateField('creci', e.target.value)}
          placeholder="Ex: 123.456"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Especialidade
        </label>
        <input
          type="text"
          value={config.specialty || config.title || ''}
          onChange={(e) => {
            updateField('specialty', e.target.value);
            updateField('title', e.target.value);
          }}
          placeholder="Especialista em Imóveis Rurais"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Telefone
        </label>
        <input
          type="text"
          value={config.phone || ''}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="(11) 99999-9999"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          E-mail
        </label>
        <input
          type="email"
          value={config.email || ''}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="corretor@exemplo.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Instagram
        </label>
        <input
          type="text"
          value={config.instagram || ''}
          onChange={(e) => updateField('instagram', e.target.value)}
          placeholder="@corretor"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Descrição / Bio
        </label>
        <textarea
          value={config.description || config.bio || ''}
          onChange={(e) => {
            updateField('description', e.target.value);
            updateField('bio', e.target.value);
          }}
          rows={4}
          placeholder="Fale sobre o corretor..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>
    </div>
  );
};

export default BrokerCardBlockSettings;
