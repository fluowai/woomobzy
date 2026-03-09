import React from 'react';
import { Play } from 'lucide-react';

export interface VideoBlockConfig {
  url: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  controls: boolean;
  title?: string;
  coverImage?: string;
}

interface VideoBlockProps {
  config: VideoBlockConfig;
  theme: any;
}

const VideoBlock: React.FC<VideoBlockProps> = ({ config, theme }) => {
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.includes('youtu.be') 
        ? url.split('/').pop() 
        : url.split('v=')[1]?.split('&')[0];
      
      const params = new URLSearchParams();
      if (config.autoplay) params.append('autoplay', '1');
      if (config.loop) {
        params.append('loop', '1');
        params.append('playlist', videoId || '');
      }
      if (config.muted) params.append('mute', '1');
      if (!config.controls) params.append('controls', '0');
      
      return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.split('/').pop();
      const params = new URLSearchParams();
      if (config.autoplay) params.append('autoplay', '1');
      if (config.loop) params.append('loop', '1');
      if (config.muted) params.append('muted', '1');
      
      return `https://player.vimeo.com/video/${videoId}?${params.toString()}`;
    }

    return url;
  };

  const isDirectFile = config.url?.match(/\.(mp4|webm|ogg)$/);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {config.title && (
        <h3 
          className="text-2xl md:text-3xl font-bold text-center mb-8"
          style={{ fontFamily: theme.headingFontFamily, color: theme.textColor }}
        >
          {config.title}
        </h3>
      )}
      
      <div className="relative w-full rounded-xl overflow-hidden shadow-xl bg-black aspect-video group">
        {!config.url ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
            <div className="text-center">
              <Play size={48} className="mx-auto mb-2 opacity-50" />
              <p>Adicione uma URL de vídeo</p>
            </div>
          </div>
        ) : isDirectFile ? (
          <video
            src={config.url}
            className="w-full h-full object-cover"
            controls={config.controls}
            autoPlay={config.autoplay}
            loop={config.loop}
            muted={config.muted}
            poster={config.coverImage}
            playsInline
          />
        ) : (
          <iframe
            src={getEmbedUrl(config.url)}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={config.title || 'Video'}
          />
        )}
      </div>
    </div>
  );
};

export default VideoBlock;
