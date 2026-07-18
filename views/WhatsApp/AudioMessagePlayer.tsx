import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from 'react';
import {
  AlertTriangle,
  DownloadCloud,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { mediaApi, type Message } from './hooks/api';

interface AudioMessagePlayerProps {
  message: Message;
}

type PlayerStatus =
  | 'pending'
  | 'downloading'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'expired';

const SPEEDS = [1, 1.5, 2];

const AudioMessagePlayer: React.FC<AudioMessagePlayerProps> = ({ message }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>(
    resolveInitialStatus(message)
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [sourceUrl, setSourceUrl] = useState(message.media_url || '');
  const [sourceMimeType, setSourceMimeType] = useState(
    message.media_mimetype || 'audio/ogg'
  );
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  const speed = SPEEDS[speedIndex];
  const waveform = useMemo(
    () => buildWaveform(message.message_id || message.id),
    [message.id, message.message_id]
  );
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed, reloadKey]);

  useEffect(() => {
    let isMounted = true;

    if (message.media_url) {
      setSourceUrl(message.media_url);
      setSourceMimeType(message.media_mimetype || 'audio/ogg');
      setStatus('downloading');
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    if (!message.media_id) {
      setStatus(resolveInitialStatus(message));
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    setStatus('downloading');
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);

    mediaApi
      .getUrl(message.media_id)
      .then((response) => {
        if (!isMounted) return;
        if (response.url) {
          setSourceUrl(response.url);
          setSourceMimeType(
            response.mime_type || message.media_mimetype || 'audio/ogg'
          );
          setStatus(
            response.status === 'ready'
              ? 'downloading'
              : (response.status as PlayerStatus)
          );
          return;
        }
        const nextStatus = normalizePlayerStatus(response.status);
        setSourceUrl('');
        setStatus(nextStatus === 'ready' ? 'pending' : nextStatus || 'pending');
      })
      .catch((err: any) => {
        if (!isMounted) return;
        setSourceUrl(message.media_url || '');
        setSourceMimeType(message.media_mimetype || 'audio/ogg');
        if (err?.code === 'MEDIA_NOT_READY') {
          const nextStatus = normalizePlayerStatus(err?.details?.status);
          setStatus(
            nextStatus === 'ready' ? 'pending' : nextStatus || 'pending'
          );
          return;
        }
        setStatus('failed');
      });

    return () => {
      isMounted = false;
    };
  }, [message.media_id, message.media_status, message.media_url, reloadKey]);

  useEffect(() => {
    if (!sourceUrl) {
      setStatus(resolveInitialStatus(message));
      setIsPlaying(false);
      setDuration(0);
      setCurrentTime(0);
      return;
    }

    setStatus(
      resolveInitialStatus(message) === 'ready'
        ? 'downloading'
        : resolveInitialStatus(message)
    );
    setIsPlaying(false);
    setDuration(0);
    setCurrentTime(0);
  }, [message.media_status, message.media_url, sourceUrl]);

  const fetchUrl = useCallback(() => {
    if (!message.media_id) return;
    mediaApi
      .getUrl(message.media_id)
      .then((response) => {
        if (response.url) {
          setSourceUrl(response.url);
          setSourceMimeType(
            response.mime_type || message.media_mimetype || 'audio/ogg'
          );
          setStatus('downloading');
        }
      })
      .catch(() => {});
  }, [message.media_id, message.media_mimetype]);

  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return;
    if (sourceUrl) return;
    if (!message.media_id) return;

    const pollInterval = setInterval(() => {
      fetchUrl();
    }, 4000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [status, sourceUrl, message.media_id, fetchUrl]);

  const togglePlayback = async (event: React.MouseEvent) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio || status === 'failed' || status === 'expired') return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    try {
      await audio.play();
    } catch {
      setStatus('failed');
      setIsPlaying(false);
    }
  };

  const retry = (event: React.MouseEvent) => {
    event.stopPropagation();
    setStatus('pending');
    setSourceUrl('');
    setRefreshAttempts(0);
    if (message.media_id) {
      mediaApi
        .retry(message.media_id)
        .catch(() => setStatus('failed'))
        .finally(() => setReloadKey((value) => value + 1));
      return;
    }
    setReloadKey((value) => value + 1);
  };

  const cycleSpeed = (event: React.MouseEvent) => {
    event.stopPropagation();
    setSpeedIndex((value) => (value + 1) % SPEEDS.length);
  };

  const seek = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const audio = audioRef.current;
    if (!audio || !duration || status === 'failed' || status === 'expired')
      return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width)
    );
    audio.currentTime = ratio * duration;
    setCurrentTime(audio.currentTime);
  };

  return (
    <div className={`wa-audio-modern status-${status}`}>
      {sourceUrl && (
        <audio
          key={`${sourceUrl}-${reloadKey}`}
          ref={audioRef}
          preload="metadata"
          controls={false}
          onLoadedMetadata={(event) => {
            const nextDuration = Number(event.currentTarget.duration);
            setDuration(Number.isFinite(nextDuration) ? nextDuration : 0);
            setStatus('ready');
            setRefreshAttempts(0);
          }}
          onTimeUpdate={(event) =>
            setCurrentTime(event.currentTarget.currentTime)
          }
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            if (message.media_id && refreshAttempts < 1) {
              setRefreshAttempts((value) => value + 1);
              setStatus('downloading');
              mediaApi
                .getUrl(message.media_id, 86400)
                .then((response) => {
                  if (response.url) {
                    setSourceUrl(response.url);
                    setSourceMimeType(
                      response.mime_type ||
                        message.media_mimetype ||
                        sourceMimeType
                    );
                    setReloadKey((value) => value + 1);
                    return;
                  }
                  setStatus(normalizePlayerStatus(response.status) || 'failed');
                })
                .catch(() => setStatus('failed'));
              return;
            }
            setStatus('failed');
            setIsPlaying(false);
          }}
        >
          <source src={sourceUrl} type={sourceMimeType} />
        </audio>
      )}

      <button
        type="button"
        className="wa-audio-main-btn"
        onClick={
          status === 'failed' || status === 'expired' ? retry : togglePlayback
        }
        aria-label={
          status === 'failed' || status === 'expired'
            ? 'Tentar carregar audio novamente'
            : isPlaying
              ? 'Pausar audio'
              : 'Reproduzir audio'
        }
        title={
          status === 'failed' || status === 'expired'
            ? 'Tentar novamente'
            : isPlaying
              ? 'Pausar'
              : 'Reproduzir'
        }
      >
        {status === 'failed' || status === 'expired' ? (
          <RotateCcw size={18} />
        ) : isPlaying ? (
          <Pause size={18} />
        ) : status === 'pending' ||
          status === 'processing' ||
          status === 'downloading' ? (
          <DownloadCloud size={18} />
        ) : (
          <Play size={18} />
        )}
      </button>

      <div className="wa-audio-body">
        <div className="wa-audio-status-row">
          <span className="wa-audio-status">
            {(status === 'failed' || status === 'expired') && (
              <AlertTriangle size={13} />
            )}
            {status === 'downloading' && <DownloadCloud size={13} />}
            {statusLabel(status)}
          </span>
          <button
            type="button"
            className="wa-audio-speed"
            onClick={cycleSpeed}
            title="Alterar velocidade"
          >
            {speed}x
          </button>
        </div>

        <div
          className="wa-audio-waveform"
          onClick={seek}
          role="slider"
          aria-label="Progresso do audio"
        >
          {waveform.map((height, index) => {
            const active = index / waveform.length <= progress;
            return (
              <span
                key={`${height}-${index}`}
                className={active ? 'active' : ''}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <div className="wa-audio-footer">
          <span>{formatDuration(currentTime)}</span>
          <span>{duration ? formatDuration(duration) : '--:--'}</span>
        </div>
      </div>
    </div>
  );
};

function buildWaveform(seed: string): number[] {
  const source = seed || 'audio';
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return Array.from({ length: 32 }, (_, index) => {
    hash = (hash * 1664525 + 1013904223 + index) >>> 0;
    return 6 + (hash % 22);
  });
}

function resolveInitialStatus(message: Message): PlayerStatus {
  if (message.media_status && message.media_status !== 'none') {
    if (message.media_status === 'ready' && !message.media_url) {
      return message.media_id ? 'downloading' : 'failed';
    }
    return message.media_status;
  }
  if (message.media_url) return 'ready';
  return message.media_id ? 'pending' : 'failed';
}

function shouldRequestMediaUrl(mediaStatus?: Message['media_status']) {
  return (
    !mediaStatus ||
    mediaStatus === 'none' ||
    mediaStatus === 'ready' ||
    mediaStatus === 'failed' ||
    mediaStatus === 'expired'
  );
}

function normalizePlayerStatus(value: unknown): PlayerStatus | undefined {
  if (
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

function statusLabel(status: PlayerStatus): string {
  switch (status) {
    case 'pending':
      return 'Processando audio';
    case 'downloading':
      return 'Baixando audio';
    case 'processing':
      return 'Processando audio';
    case 'expired':
      return 'Audio expirado';
    case 'failed':
      return 'Falha no audio';
    case 'ready':
    default:
      return 'Pronto';
  }
}

function formatDuration(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '00:00';
  const total = Math.floor(value);
  const minutes = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (total % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export default AudioMessagePlayer;
