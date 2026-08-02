import React, { useState, useEffect, useRef } from 'react';
import './whatsapp.css';
import { useWebSocket } from './hooks/useWebSocket';
import { instanceApi, type Instance } from './hooks/api';
import {
  X,
  QrCode,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Smartphone,
  KeyRound,
  Phone,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { logger } from '@/utils/logger';

interface QRCodeModalProps {
  instance: Instance;
  onClose: () => void;
}

export const QR_CODE_WAIT_TIMEOUT_MS = 30_000;

export function didQRCodeWaitTimeout(
  startedAt: number,
  now = Date.now()
): boolean {
  return now - startedAt >= QR_CODE_WAIT_TIMEOUT_MS;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ instance, onClose }) => {
  const [qrCode, setQrCode] = useState<string>(instance.qr_code || '');
  const [status, setStatus] = useState<Instance['status']>(instance.status);
  const [loading, setLoading] = useState(!instance.qr_code);
  const [pairingError, setPairingError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [pairingMode, setPairingMode] = useState<'qr' | 'code'>('qr');
  const [pairingPhone, setPairingPhone] = useState(instance.phone || '');
  const [pairingCode, setPairingCode] = useState('');
  const [pairingLoading, setPairingLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');
  const { on } = useWebSocket();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const qrCodeRef = useRef(qrCode);
  const lastQRFetchRef = useRef(0);
  const emptyQRAttemptsRef = useRef(0);
  const qrWaitStartedAtRef = useRef(Date.now());
  const qrWaitTimedOutRef = useRef(false);

  useEffect(() => {
    qrCodeRef.current = qrCode;
  }, [qrCode]);

  useEffect(() => {
    // Listen for QR code updates
    const unsubQR = on('qr_code', (data: any) => {
      if (data.instance_id === instance.id) {
        qrWaitStartedAtRef.current = Date.now();
        qrWaitTimedOutRef.current = false;
        qrCodeRef.current = data.qr_code;
        setQrCode(data.qr_code);
        setLoading(false);
        setStatus('qr_pending');
        setPairingError('');
        setExpiresAt(data.expires_at || '');
      }
    });

    const unsubPairingCode = on('pairing_code', (data: any) => {
      if (data.instance_id === instance.id) {
        setPairingMode('code');
        setPairingCode(data.pairing_code);
        setPairingPhone(data.phone || pairingPhone);
        setPairingLoading(false);
        setPairingError('');
        setExpiresAt(data.expires_at || '');
      }
    });

    // Listen for status updates
    const unsubStatus = on('instance_status', (data: any) => {
      if (data.instance_id === instance.id) {
        setStatus(data.status);
        if (data.error) {
          setPairingError(data.error);
          setQrCode('');
          setLoading(false);
        }
        if (data.status === 'connected') {
          // Auto-close after successful connection
          closeTimeoutRef.current = setTimeout(onClose, 1800);
        }
      }
    });

    fetchQR();
    pollingRef.current = setInterval(fetchQR, 3000);

    return () => {
      unsubQR();
      unsubPairingCode();
      unsubStatus();
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, [instance.id, on]);

  const fetchQR = async () => {
    if (
      !qrCodeRef.current &&
      (qrWaitTimedOutRef.current ||
        didQRCodeWaitTimeout(qrWaitStartedAtRef.current))
    ) {
      qrWaitTimedOutRef.current = true;
      setLoading(false);
      setPairingError(
        'O WhatsMeow não gerou o QR Code em 30 segundos. Tente gerar um novo código.'
      );
      return;
    }

    try {
      const freshInstance = await instanceApi.get(instance.id);
      setStatus(freshInstance.status);

      if (freshInstance.status === 'connected') {
        setQrCode('');
        setLoading(false);
        emptyQRAttemptsRef.current = 0;
        if (pollingRef.current) clearInterval(pollingRef.current);
        closeTimeoutRef.current = setTimeout(onClose, 1800);
        return;
      }

      if (freshInstance.qr_code && !qrCodeRef.current) {
        qrCodeRef.current = freshInstance.qr_code;
        setQrCode(freshInstance.qr_code);
        setLoading(false);
        setPairingError('');
        emptyQRAttemptsRef.current = 0;
      }

      const shouldRefreshQR = Date.now() - lastQRFetchRef.current > 2500;

      if (shouldRefreshQR) {
        lastQRFetchRef.current = Date.now();
        const data = await instanceApi.getQRCode(instance.id);
        if (data.qr_code) {
          qrWaitStartedAtRef.current = Date.now();
          qrWaitTimedOutRef.current = false;
          qrCodeRef.current = data.qr_code;
          setQrCode(data.qr_code);
          setLoading(false);
          setPairingError('');
          setExpiresAt(data.expires_at || '');
          emptyQRAttemptsRef.current = 0;
        } else if (qrWaitTimedOutRef.current) {
          return;
        } else if (
          freshInstance.status === 'connecting' ||
          freshInstance.status === 'qr_pending'
        ) {
          // Conexão ativa mas QR ainda não emitido — mantém aguardando.
          setLoading(true);
        } else if (emptyQRAttemptsRef.current >= 3) {
          // Várias tentativas sem QR e sem conexão ativa: mostra erro + retry
          // em vez de spinner infinito.
          setLoading(false);
          setPairingError(
            'QR Code não disponível. Verifique se o WhatsApp está acessível e tente novamente.'
          );
        } else {
          emptyQRAttemptsRef.current += 1;
          setLoading(true);
        }
      }
    } catch (error: any) {
      if (error?.status === 404) {
        setNotFound(true);
        if (pollingRef.current) clearInterval(pollingRef.current);
        return;
      }
      if (error?.status) {
        setPairingError(error.message || 'Não foi possível gerar o QR Code.');
        setLoading(false);
      }
    }
  };

  const requestPairingCode = async () => {
    try {
      setPairingLoading(true);
      setPairingError('');
      setPairingCode('');
      const data = await instanceApi.requestPairingCode(
        instance.id,
        pairingPhone
      );
      setPairingCode(data.pairing_code);
      setPairingPhone(data.phone || pairingPhone);
      setExpiresAt(
        data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : ''
      );
    } catch (error: any) {
      setPairingError(
        error.message || 'Nao foi possivel gerar o codigo de pareamento.'
      );
    } finally {
      setPairingLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }} onClick={onClose}>
      <div className="wa-qr-modal" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="wa-qr-close">
          <X size={20} />
        </button>

        {status === 'connected' ? (
          <div className="wa-qr-success">
            <div className="wa-qr-success-icon">
              <CheckCircle2 size={64} />
            </div>
            <h3>Conectado com sucesso!</h3>
            <p>
              Instância <strong>{instance.name}</strong> está online.
            </p>
          </div>
        ) : (
          <>
            <div className="wa-qr-header">
              {pairingMode === 'qr' ? (
                <QrCode size={28} className="text-[#25D366]" />
              ) : (
                <KeyRound size={28} className="text-[#25D366]" />
              )}
              <div>
                <h3>Conectar WhatsApp</h3>
                <p className="wa-qr-subtitle">{instance.name}</p>
              </div>
            </div>

            <div className="wa-pair-tabs">
              <button
                className={pairingMode === 'qr' ? 'active' : ''}
                onClick={() => setPairingMode('qr')}
              >
                <QrCode size={15} /> QR
              </button>
              <button
                className={pairingMode === 'code' ? 'active' : ''}
                onClick={() => setPairingMode('code')}
              >
                <KeyRound size={15} /> Codigo
              </button>
            </div>

            <div className="wa-qr-instructions">
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">1</span>
                <span>Abra o WhatsApp no celular</span>
              </div>
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">2</span>
                <span>
                  Toque em <strong>Menu</strong> ou{' '}
                  <strong>Configurações</strong>
                </span>
              </div>
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">3</span>
                <span>
                  Selecione <strong>Aparelhos Conectados</strong>
                </span>
              </div>
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">4</span>
                <span>Escaneie o código abaixo</span>
              </div>
            </div>

            <div className="wa-qr-container">
              {notFound ? (
                <div className="wa-qr-error">
                  <p>
                    Instância não encontrada. Ela pode ter sido removida ou o
                    acesso expirou.
                  </p>
                  <button onClick={onClose} className="wa-qr-retry">
                    <X size={14} /> Fechar
                  </button>
                </div>
              ) : pairingMode === 'code' ? (
                <div className="wa-pair-code-box">
                  <label className="wa-pair-phone">
                    <Phone size={16} />
                    <input
                      value={pairingPhone}
                      onChange={(event) => setPairingPhone(event.target.value)}
                      placeholder="+55 11 99999-9999"
                    />
                  </label>
                  <button
                    onClick={requestPairingCode}
                    className="wa-qr-retry"
                    disabled={pairingLoading || !pairingPhone.trim()}
                  >
                    {pairingLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <KeyRound size={14} />
                    )}
                    Gerar codigo
                  </button>
                  {pairingCode && (
                    <strong className="wa-pair-code">{pairingCode}</strong>
                  )}
                  {pairingError && (
                    <p className="wa-pair-error">{pairingError}</p>
                  )}
                </div>
              ) : loading ? (
                <div className="wa-qr-loading">
                  <Loader2 size={40} className="animate-spin" />
                  <p>Gerando QR Code...</p>
                  <span>Aguarde alguns segundos</span>
                </div>
              ) : pairingError ? (
                <div className="wa-qr-error">
                  <p>{pairingError}</p>
                  <button
                    onClick={async () => {
                      qrWaitStartedAtRef.current = Date.now();
                      qrWaitTimedOutRef.current = false;
                      emptyQRAttemptsRef.current = 0;
                      setPairingError('');
                      setLoading(true);
                      setQrCode('');
                      try {
                        await instanceApi.connect(instance.id);
                      } catch (error) {
                        logger.error(
                          'Falha ao reconectar instância do WhatsApp',
                          error
                        );
                      }
                      fetchQR();
                    }}
                    className="wa-qr-retry"
                  >
                    <RefreshCw size={14} /> Gerar novo QR Code
                  </button>
                </div>
              ) : qrCode ? (
                <div className="wa-qr-image-wrapper">
                  <QRCodeSVG
                    value={qrCode}
                    size={280}
                    level="M"
                    marginSize={2}
                    title="QR Code para conectar o WhatsApp"
                    className="wa-qr-image"
                  />
                  <div className="wa-qr-phone-icon">
                    <Smartphone size={24} className="text-[#25D366]" />
                  </div>
                </div>
              ) : (
                <div className="wa-qr-error">
                  <p>QR Code não disponível</p>
                  <button
                    onClick={async () => {
                      qrWaitStartedAtRef.current = Date.now();
                      qrWaitTimedOutRef.current = false;
                      emptyQRAttemptsRef.current = 0;
                      setLoading(true);
                      try {
                        await instanceApi.connect(instance.id);
                      } catch (error) {
                        logger.error(
                          'Falha ao reconectar instância do WhatsApp',
                          error
                        );
                      }
                      fetchQR();
                    }}
                    className="wa-qr-retry"
                  >
                    <RefreshCw size={14} /> Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {(qrCode || pairingCode) && (
              <p className="wa-qr-note">
                O QR Code é renovado automaticamente
                {expiresAt
                  ? ` até ${new Date(expiresAt).toLocaleTimeString('pt-BR')}`
                  : ''}
                .
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QRCodeModal;
