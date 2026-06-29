import React, { useEffect, useState } from 'react';
import { Check, CheckCheck, Clock, Contact, DownloadCloud, FileText, FileVideo, Image, MapPin, RefreshCw } from 'lucide-react';
import AudioMessagePlayer from './AudioMessagePlayer';
import { formatPhoneDisplay, mediaApi, type Message } from './hooks/api';
import { toast } from 'sonner';

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
  const [mediaStatusOverride, setMediaStatusOverride] = useState<Message['media_status'] | undefined>();
  const [retryingMedia, setRetryingMedia] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);
  const isSent = message.is_from_me;
  const effectiveMediaStatus = mediaStatusOverride || message.media_status;
  const content = (message.content || '').trim();
  const hasMedia = Boolean(
    message.media_url ||
    message.media_id ||
    message.media_filename ||
    (effectiveMediaStatus && effectiveMediaStatus !== 'none')
  );
  const isRenderable = message.type === 'text' ? Boolean(content) : Boolean(content || hasMedia);

  useEffect(() => {
    setMediaStatusOverride(undefined);
    setImgError(false);
    setOpeningDocument(false);
  }, [message.id, message.media_id]);

  useEffect(() => {
    setMediaSourceUrl(message.media_url || '');
    if (!message.media_id || message.type === 'audio') return;
    if (!shouldRequestMediaUrl(effectiveMediaStatus)) return;

    let active = true;
    mediaApi
      .getUrl(message.media_id)
      .then((result) => {
        if (active && result?.url) setMediaSourceUrl(result.url);
      })
      .catch((err: any) => {
        if (!active) return;
        setMediaSourceUrl(message.media_url || '');
        if (err?.code === 'MEDIA_NOT_READY') {
          const nextStatus = normalizeMediaStatus(err?.details?.status);
          setMediaStatusOverride(nextStatus === 'ready' ? 'pending' : nextStatus || 'pending');
        }
      });

    return () => {
      active = false;
    };
  }, [message.media_id, message.media_status, message.media_url, message.type]);

  if (!isRenderable) return null;

  const senderPhone = formatPhoneDisplay(message.sender_phone);
  const senderName =
    message.sender_name && message.sender_name !== '~'
      ? message.sender_name
      : senderPhone || 'Contato sem telefone';
  const senderInitial = (senderName.match(/[A-Za-z0-9]/)?.[0] || '?').toUpperCase();
  const showSenderName = !isSent && isGroup;
  const deliveryStatus = message.delivery_status || 'sent';
  const mediaLabel = getMediaLabel(message);
  const mediaState = getMediaState(message, mediaSourceUrl, effectiveMediaStatus);
  const canRetryMedia = Boolean(message.media_id && (effectiveMediaStatus === 'failed' || effectiveMediaStatus === 'expired'));

  const retryMedia = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!message.media_id || retryingMedia) return;

    setRetryingMedia(true);
    try {
      await mediaApi.retry(message.media_id);
      setMediaStatusOverride('pending');
      toast.success('Midia reenviada para recuperacao.');
    } catch (err: any) {
      toast.error(err?.message || 'Nao foi possivel solicitar a recuperacao da midia.');
    } finally {
      setRetryingMedia(false);
    }
  };

  const openDocument = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!message.media_id) {
      if (mediaSourceUrl) window.open(mediaSourceUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    const popup = window.open('', '_blank');
    setOpeningDocument(true);
    try {
      const result = await mediaApi.getUrl(message.media_id, 900);
      const freshUrl = result.url || mediaSourceUrl;
      if (!freshUrl) throw new Error('Arquivo ainda sem URL disponivel.');
      setMediaSourceUrl(freshUrl);
      if (popup) {
        popup.opener = null;
        popup.location.href = freshUrl;
      } else {
        window.open(freshUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      if (popup) popup.close();
      toast.error(err?.message || 'Nao foi possivel abrir o documento.');
    } finally {
      setOpeningDocument(false);
    }
  };

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
            {mediaSourceUrl && !imgError ? (
              <img
                src={mediaSourceUrl}
                alt="Imagem"
                className="wa-bubble-image"
                loading="lazy"
                onError={() => setImgError(true)}
                onClick={(event) => {
                  event.stopPropagation();
                  window.open(mediaSourceUrl, '_blank');
                }}
              />
            ) : (
              <MediaPlaceholder
                icon={<Image size={20} />}
                label={mediaLabel}
                state={mediaState}
                canRetry={canRetryMedia}
                retrying={retryingMedia}
                onRetry={retryMedia}
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
            {mediaSourceUrl ? (
              <video controls preload="none" className="wa-bubble-video" onClick={(event) => event.stopPropagation()}>
                <source src={mediaSourceUrl} type={message.media_mimetype || 'video/mp4'} />
              </video>
            ) : (
              <MediaPlaceholder
                icon={<FileVideo size={20} />}
                label={mediaLabel}
                state={mediaState}
                canRetry={canRetryMedia}
                retrying={retryingMedia}
                onRetry={retryMedia}
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
            onClick={openDocument}
          >
            {openingDocument ? <RefreshCw size={28} className="animate-spin" /> : <FileText size={28} />}
            <div>
              <span className="wa-doc-name">{message.media_filename || 'Arquivo recebido'}</span>
              <span className="wa-doc-type">{openingDocument ? 'Gerando link seguro...' : message.media_mimetype || 'Documento'}</span>
            </div>
          </a>
        ) : (
          <div className="wa-bubble-document is-disabled" onClick={(event) => event.stopPropagation()}>
            <FileText size={28} />
            <div>
              <span className="wa-doc-name">{message.media_filename || 'Arquivo recebido'}</span>
              <span className="wa-doc-type">{mediaState}</span>
              {canRetryMedia && (
                <button type="button" className="wa-doc-retry" onClick={retryMedia} disabled={retryingMedia}>
                  {retryingMedia ? 'Solicitando...' : 'Tentar novamente'}
                </button>
              )}
            </div>
          </div>
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
            {mediaSourceUrl ? (
              <img src={mediaSourceUrl} alt="Sticker" className="wa-sticker-img" />
            ) : (
              <MediaPlaceholder
                icon={<Image size={20} />}
                label={mediaLabel}
                state={mediaState}
                canRetry={canRetryMedia}
                retrying={retryingMedia}
                onRetry={retryMedia}
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

function MediaPlaceholder({
  icon,
  label,
  state,
  canRetry,
  retrying,
  onRetry,
}: {
  icon: React.ReactNode;
  label: string;
  state: string;
  canRetry?: boolean;
  retrying?: boolean;
  onRetry?: (event: React.MouseEvent) => void;
}) {
  const pending = /baixando|processando|aguardando/i.test(state);
  return (
    <div className="wa-bubble-media-placeholder">
      <span className="wa-media-placeholder-icon">{pending ? <RefreshCw size={18} className="animate-spin" /> : icon}</span>
      <span className="wa-media-placeholder-copy">
        <strong>{label}</strong>
        <small>{state}</small>
      </span>
      {canRetry ? (
        <button type="button" className="wa-media-retry" onClick={onRetry} disabled={retrying}>
          {retrying ? <RefreshCw size={14} className="animate-spin" /> : 'Tentar'}
        </button>
      ) : (
        !pending && <DownloadCloud size={16} className="wa-media-placeholder-action" />
      )}
    </div>
  );
}

function getMediaLabel(message: Message) {
  if (message.media_filename) return message.media_filename;
  const labels: Record<Message['type'], string> = {
    text: 'Mensagem',
    image: 'Imagem recebida',
    audio: 'Audio recebido',
    video: 'Video recebido',
    document: 'Documento recebido',
    sticker: 'Figurinha recebida',
    location: 'Localizacao recebida',
    contact: 'Contato recebido',
    unknown: 'Mensagem recebida',
  };
  return labels[message.type] || 'Midia recebida';
}

function getMediaState(message: Message, mediaSourceUrl: string, mediaStatus?: Message['media_status']) {
  if (mediaSourceUrl) return message.media_mimetype || 'Toque para abrir';
  if (mediaStatus === 'pending') return 'Aguardando download';
  if (mediaStatus === 'downloading') return 'Baixando midia';
  if (mediaStatus === 'processing') return 'Processando midia';
  if (mediaStatus === 'failed') return message.media_error || 'Nao foi possivel carregar';
  if (mediaStatus === 'expired') return 'Midia expirada';
  if (message.media_id) return 'Preparando visualizacao';
  return 'Midia sem arquivo disponivel';
}

function shouldRequestMediaUrl(mediaStatus?: Message['media_status']) {
  return !mediaStatus || mediaStatus === 'none' || mediaStatus === 'ready';
}

function normalizeMediaStatus(value: unknown): Message['media_status'] | undefined {
  if (
    value === 'none' ||
    value === 'pending' ||
    value === 'downloading' ||
    value === 'processing' ||
    value === 'ready' ||
    value === 'failed' ||
    value === 'expired'
  ) {
    return value;
  }
  return undefined;
}
