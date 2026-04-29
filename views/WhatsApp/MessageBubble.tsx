import React from 'react';
import { type Message } from './hooks/api';
import { Image, FileAudio, FileVideo, FileText, MapPin, Contact, Check, CheckCheck } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGroup }) => {
  const isSent = message.is_from_me;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMedia = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="wa-bubble-media">
            {message.media_url ? (
              <img
                src={message.media_url}
                alt="Imagem"
                className="wa-bubble-image"
                loading="lazy"
                onClick={() => window.open(message.media_url, '_blank')}
              />
            ) : (
              <div className="wa-bubble-media-placeholder">
                <Image size={24} />
                <span>Imagem</span>
              </div>
            )}
            {message.content && <p className="wa-bubble-caption">{message.content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="wa-bubble-audio">
            {message.media_url ? (
              <audio controls preload="none" className="wa-audio-player">
                <source src={message.media_url} type={message.media_mimetype || 'audio/ogg'} />
              </audio>
            ) : (
              <div className="wa-bubble-media-placeholder">
                <FileAudio size={24} />
                <span>Áudio</span>
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="wa-bubble-media">
            {message.media_url ? (
              <video controls preload="none" className="wa-bubble-video">
                <source src={message.media_url} type={message.media_mimetype || 'video/mp4'} />
              </video>
            ) : (
              <div className="wa-bubble-media-placeholder">
                <FileVideo size={24} />
                <span>Vídeo</span>
              </div>
            )}
            {message.content && <p className="wa-bubble-caption">{message.content}</p>}
          </div>
        );

      case 'document':
        return (
          <a
            href={message.media_url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-bubble-document"
          >
            <FileText size={28} />
            <div>
              <span className="wa-doc-name">{message.media_filename || message.content || 'Documento'}</span>
              <span className="wa-doc-type">{message.media_mimetype || 'PDF'}</span>
            </div>
          </a>
        );

      case 'location':
        return (
          <div className="wa-bubble-media-placeholder">
            <MapPin size={24} />
            <span>Localização: {message.content}</span>
          </div>
        );

      case 'contact':
        return (
          <div className="wa-bubble-media-placeholder">
            <Contact size={24} />
            <span>Contato: {message.content}</span>
          </div>
        );

      case 'sticker':
        return (
          <div className="wa-bubble-sticker">
            {message.media_url ? (
              <img src={message.media_url} alt="Sticker" className="wa-sticker-img" />
            ) : (
              <span>🎨 Sticker</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`wa-bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
      <div className={`wa-bubble ${isSent ? 'wa-bubble-sent' : 'wa-bubble-received'}`}>
        {/* Group sender name */}
        {isGroup && !isSent && (
          <span className="wa-bubble-sender">{message.sender_name || message.sender_phone}</span>
        )}

        {/* Media or text content */}
        {message.type !== 'text' && renderMedia()}
        {message.type === 'text' && <p className="wa-bubble-text">{message.content}</p>}

        {/* Timestamp + check marks */}
        <div className="wa-bubble-meta">
          <span className="wa-bubble-time">{formatTime(message.timestamp)}</span>
          {isSent && (
            <CheckCheck size={14} className="wa-bubble-check read" />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
