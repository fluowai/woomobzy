import React, { useEffect, useRef, useState } from 'react';
import { Check, CheckCheck, Clock, Contact, FileText, FileVideo, Image, MapPin } from 'lucide-react';
import AudioMessagePlayer from './AudioMessagePlayer';
import { formatPhoneDisplay, isPlaceholderName, mediaApi, type Message } from './hooks/api';

/** WhatsApp CDN profile-pic URLs expire and require WA session - never load in browser. */
function isWhatsAppCdnUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('pps.whatsapp.net') || url.includes('mmg.whatsapp.net');
}

interface MessageBubbleProps {
  message: Message;
  isGroup: boolean;
  chatDisplayName?: string;
  onOpenDetails?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, chatDisplayName, onOpenDetails }) => {
  const [avatarError, setAvatarError] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [mediaSourceUrl, setMediaSourceUrl] = useState(message.media_url || '');
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaLoadError, setMediaLoadError] = useState('');
  const isSent = message.is_from_me;
  const content = (message.content || '').trim();
  const hasMedia = Boolean(message.media_url || message.media_id || message.media_filename || message.media_status === 'pending');
  const isRenderable = message.type !== 'text' || content || hasMedia;

  useEffect(() => {
    let active = true;

    const currentUrl = message.media_url || '';
    setMediaSourceUrl(currentUrl);
    setMediaLoadError('');
    setMediaError(false);

    if (!message.media_id || message.type === 'audio') return;

    if (currentUrl) return;

    setMediaLoading(true);
    mediaApi
      .getUrl(message.media_id)
      .then((result) => {
        if (!active) return;
        if (result?.url) {
          setMediaSourceUrl(result.url);
          setMediaLoadError('');
          return;
        }
        setMediaLoadError(result?.error || 'Midia ainda em processamento.');
      })
      .catch((error: any) => {
        if (!active) return;
        setMediaLoadError(error?.message || 'Nao foi possivel carregar a midia.');
      })
      .finally(() => {
        if (active) setMediaLoading(false);
      });

    return () => {
      active = false;
    };
  }, [message.media_id, message.media_url, message.type]);

  if (!isRenderable) return null;

  const senderPhone = formatPhoneDisplay(message.sender_phone);
  const senderName = resolveSenderName(message.sender_name, chatDisplayName, senderPhone);
  const senderInitial = (senderName.match(/[A-Za-z0-9]/)?.[0] || '?').toUpperCase();
  const showSenderName = !isSent;
  const deliveryStatus = message.delivery_status || 'sent';

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const refreshMediaUrl = (event?: React.MouseEvent, expiresInSeconds = 900) => {
    if (event) event.stopPropagation();
    if (!message.media_id || mediaLoading) return;
    setMediaLoading(true);
    setMediaLoadError('');
    setMediaError(false);
    mediaApi
      .getUrl(message.media_id, expiresInSeconds)
      .then((result) => {
        if (result?.url) {
          setMediaSourceUrl(result.url);
          return;
        }
        setMediaSourceUrl('');
        setMediaLoadError(result?.error || 'Midia ainda em processamento.');
      })
      .catch((error: any) => {
        setMediaLoadError(error?.message || 'Nao foi possivel carregar a midia.');
      })
      .finally(() => setMediaLoading(false));
  };

  const autoRefreshMedia = useRef(false);
  const handleMediaError = () => {
    if (autoRefreshMedia.current) {
      setMediaError(true);
      return;
    }
    autoRefreshMedia.current = true;
    if (message.media_id) {
      refreshMediaUrl(undefined as any, 86400);
    } else {
      setMediaError(true);
    }
  };

  const renderMedia = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="wa-bubble-media">
            {mediaSourceUrl && !mediaError ? (
              <img
                src={mediaSourceUrl}
                alt="Imagem"
                className="wa-bubble-image"
                loading="lazy"
                onError={handleMediaError}
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(mediaSourceUrl, '_blank');
                }}
              />
            ) : (
              <MediaPlaceholder
                icon={<Image size={24} />}
                label={mediaPlaceholderLabel(message, mediaLoading, mediaLoadError)}
                onRetry={message.media_id ? refreshMediaUrl : undefined}
              />
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
            {mediaSourceUrl && !mediaError ? (
              <video
                controls
                preload="none"
                className="wa-bubble-video"
                onClick={(event) => event.stopPropagation()}
                onError={handleMediaError}
              >
                <source src={mediaSourceUrl} type={message.media_mimetype || 'video/mp4'} />
              </video>
            ) : (
              <MediaPlaceholder
                icon={<FileVideo size={24} />}
                label={mediaPlaceholderLabel(message, mediaLoading, mediaLoadError, 'Video')}
                onRetry={message.media_id ? refreshMediaUrl : undefined}
              />
            )}
            {content && <p className="wa-bubble-caption">{content}</p>}
          </div>
        );

      case 'document':
        return mediaSourceUrl ? (
          <a
            href={mediaSourceUrl}
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
        ) : (
          <MediaPlaceholder
            icon={<FileText size={24} />}
            label={mediaPlaceholderLabel(message, mediaLoading, mediaLoadError, message.media_filename || 'Documento')}
            onRetry={message.media_id ? refreshMediaUrl : undefined}
          />
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
            {mediaSourceUrl && !mediaError ? (
              <img
                src={mediaSourceUrl}
                alt="Sticker"
                className="wa-sticker-img"
                loading="lazy"
                onError={handleMediaError}
              />
            ) : (
              <MediaPlaceholder
                icon={<Image size={22} />}
                label={mediaPlaceholderLabel(message, mediaLoading, mediaLoadError, 'Figurinha')}
                onRetry={message.media_id ? refreshMediaUrl : undefined}
              />
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
          {message.sender_avatar_url && !isWhatsAppCdnUrl(message.sender_avatar_url) && !avatarError ? (
            <img src={message.sender_avatar_url} alt="" className="wa-avatar-img" onError={() => setAvatarError(true)} />
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

interface MediaPlaceholderProps {
  icon: React.ReactNode;
  label: string;
  onRetry?: (event: React.MouseEvent) => void;
}

const MediaPlaceholder: React.FC<MediaPlaceholderProps> = ({ icon, label, onRetry }) => (
  <button
    type="button"
    className="wa-bubble-media-placeholder"
    onClick={onRetry}
    disabled={!onRetry}
    title={onRetry ? 'Tentar carregar midia novamente' : undefined}
  >
    {icon}
    <span>{label}</span>
  </button>
);

function mediaPlaceholderLabel(
  message: Message,
  loading: boolean,
  loadError: string,
  fallback = 'Imagem'
): string {
  if (loading) return 'Carregando midia';
  if (loadError) return loadError;
  if (message.media_error) return message.media_error;
  switch (message.media_status) {
    case 'pending':
    case 'downloading':
    case 'processing':
      return 'Processando midia';
    case 'failed':
      return 'Falha ao carregar midia';
    case 'expired':
      return 'Midia expirada';
    default:
      return fallback;
  }
}

export default MessageBubble;

function resolveSenderName(rawName?: string, fallbackName?: string, fallbackPhone?: string): string {
  const cleanName = (rawName || '').trim();
  if (cleanName && !isPlaceholderName(cleanName)) return cleanName;

  const cleanFallback = (fallbackName || '').trim();
  if (cleanFallback && !isPlaceholderName(cleanFallback)) return cleanFallback;

  return fallbackPhone || 'Contato sem telefone';
}
