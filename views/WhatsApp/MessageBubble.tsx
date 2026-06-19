import React, { useEffect, useState } from 'react';
import { Check, CheckCheck, Clock, Contact, FileText, FileVideo, Image, MapPin } from 'lucide-react';
import AudioMessagePlayer from './AudioMessagePlayer';
import { formatPhoneDisplay, mediaApi, type Message } from './hooks/api';

/** WhatsApp CDN profile-pic URLs expire and require WA session — never load in browser. */
function isWhatsAppCdnUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net');
}

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
  onOpenDetails?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGroup, onOpenDetails }) => {
  const [imgError, setImgError] = useState(false);
  const [mediaSourceUrl, setMediaSourceUrl] = useState(message.media_url || '');
  const isSent = message.is_from_me;
  const content = (message.content || '').trim();
  const hasMedia = Boolean(message.media_url || message.media_id || message.media_filename || message.media_status === 'pending');
  const isRenderable = message.type !== 'text' || content || hasMedia;

  useEffect(() => {
    setMediaSourceUrl(message.media_url || '');
    if (!message.media_id || message.type === 'audio') return;

    let active = true;
    mediaApi
      .getUrl(message.media_id)
      .then((result) => {
        if (active && result?.url) setMediaSourceUrl(result.url);
      })
      .catch(() => {
        if (active) setMediaSourceUrl(message.media_url || '');
      });

    return () => {
      active = false;
    };
  }, [message.media_id, message.media_url, message.type]);

  if (!isRenderable) return null;

  const senderPhone = formatPhoneDisplay(message.sender_phone);
  const senderName =
    message.sender_name && message.sender_name !== '~'
      ? message.sender_name
      : senderPhone || 'Contato sem telefone';
  const senderInitial = (senderName.match(/[A-Za-z0-9]/)?.[0] || '?').toUpperCase();
  const showSenderName = !isSent && isGroup;
  const deliveryStatus = message.delivery_status || 'sent';

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
            {mediaSourceUrl ? (
              <img
                src={mediaSourceUrl}
                alt="Imagem"
                className="wa-bubble-image"
                loading="lazy"
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(mediaSourceUrl, '_blank');
                }}
              />
            ) : (
              <div className="wa-bubble-media-placeholder">
                <Image size={24} />
              </div>
            )}
            {content && <p className="wa-bubble-caption">{content}</p>}
          </div>
        );

      case 'audio':
        return (
          <div className="wa-bubble-audio">
            <AudioMessagePlayer message={message} />
          </div>
        );

      case 'video':
        return (
          <div className="wa-bubble-media">
            {mediaSourceUrl ? (
              <video controls preload="none" className="wa-bubble-video" onClick={(event) => event.stopPropagation()}>
                <source src={mediaSourceUrl} type={message.media_mimetype || 'video/mp4'} />
              </video>
            ) : (
              <div className="wa-bubble-media-placeholder">
                <FileVideo size={24} />
                <span>Video</span>
              </div>
            )}
            {content && <p className="wa-bubble-caption">{content}</p>}
          </div>
        );

      case 'document':
        return (
          <a
            href={mediaSourceUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="wa-bubble-document"
            onClick={(event) => event.stopPropagation()}
          >
            <FileText size={28} />
            <div>
              <span className="wa-doc-name">{message.media_filename || 'Arquivo recebido'}</span>
              {message.media_mimetype && <span className="wa-doc-type">{message.media_mimetype}</span>}
            </div>
          </a>
        );

      case 'location':
        return (
          <div className="wa-bubble-media-placeholder">
            <MapPin size={24} />
            <span>Localizacao: {message.content}</span>
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
              <span>Sticker</span>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`wa-bubble-wrapper ${isSent ? 'sent' : 'received'}`}>
      {!isSent && (
        <div className="wa-message-avatar">
          {message.sender_avatar_url && !isWhatsAppCdnUrl(message.sender_avatar_url) && !imgError ? (
            <img src={message.sender_avatar_url} alt="" className="wa-avatar-img" onError={() => setImgError(true)} />
          ) : (
            <span>{senderInitial}</span>
          )}
        </div>
      )}
      <div
        className={`wa-bubble ${isSent ? 'wa-bubble-sent' : 'wa-bubble-received'} ${onOpenDetails ? 'wa-bubble-clickable' : ''}`}
        role={onOpenDetails ? 'button' : undefined}
        tabIndex={onOpenDetails ? 0 : undefined}
        onClick={onOpenDetails}
        onKeyDown={(event) => {
          if (!onOpenDetails) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpenDetails();
          }
        }}
      >
        {showSenderName && <span className="wa-bubble-sender">{senderName}</span>}

        {message.type !== 'text' && renderMedia()}
        {message.type === 'text' && <p className="wa-bubble-text">{content}</p>}

        <div className="wa-bubble-meta">
          <span className="wa-bubble-time">{formatTime(message.timestamp)}</span>
          {isSent && (
            deliveryStatus === 'sent'
              ? <Check size={14} className="wa-bubble-check" />
              : deliveryStatus === 'failed'
                ? <Clock size={14} className="wa-bubble-check failed" />
                : <CheckCheck size={14} className={`wa-bubble-check ${deliveryStatus === 'read' || deliveryStatus === 'played' ? 'read' : ''}`} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
