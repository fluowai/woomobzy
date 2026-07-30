import React from 'react';

interface VideoBlockSettingsProps {
  config: any;
  onUpdate: (config: any) => void;
}

const VideoBlockSettings: React.FC<VideoBlockSettingsProps> = ({
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
          URL do Vídeo
        </label>
        <input
          type="url"
          value={config.url || ''}
          onChange={(e) => updateField('url', e.target.value)}
          placeholder="https://youtube.com/watch?v=... ou https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="text-xs text-gray-500 mt-1">
          YouTube, Vimeo ou URL direta (.mp4, .webm)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Título (opcional)
        </label>
        <input
          type="text"
          value={config.title || ''}
          onChange={(e) => updateField('title', e.target.value)}
          placeholder="Título do vídeo"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Capa (URL opcional)
        </label>
        <input
          type="url"
          value={config.coverImage || ''}
          onChange={(e) => updateField('coverImage', e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-900">
          Comportamento
        </h4>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.autoplay || false}
            onChange={(e) => updateField('autoplay', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Auto-play</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.loop || false}
            onChange={(e) => updateField('loop', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Loop</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.muted || false}
            onChange={(e) => updateField('muted', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Mudo</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={config.controls !== false}
            onChange={(e) => updateField('controls', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">Mostrar Controles</span>
        </label>
      </div>
    </div>
  );
};

export default VideoBlockSettings;
