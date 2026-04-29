import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import { instanceApi, type Instance } from './hooks/api';
import { X, QrCode, Loader2, CheckCircle2, RefreshCw, Smartphone } from 'lucide-react';

interface QRCodeModalProps {
  instance: Instance;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ instance, onClose }) => {
  const [qrCode, setQrCode] = useState<string>(instance.qr_code || '');
  const [status, setStatus] = useState<Instance['status']>(instance.status);
  const [loading, setLoading] = useState(!instance.qr_code);
  const { on } = useWebSocket();
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    // Listen for QR code updates
    const unsubQR = on('qr_code', (data: any) => {
      if (data.instance_id === instance.id) {
        setQrCode(data.qr_code);
        setLoading(false);
        setStatus('qr_pending');
      }
    });

    // Listen for status updates
    const unsubStatus = on('instance_status', (data: any) => {
      if (data.instance_id === instance.id) {
        setStatus(data.status);
        if (data.status === 'connected') {
          // Auto-close after successful connection
          setTimeout(onClose, 2000);
        }
      }
    });

    // Poll for QR code if not available yet
    if (!qrCode) {
      fetchQR();
      pollingRef.current = setInterval(fetchQR, 3000);
    }

    return () => {
      unsubQR();
      unsubStatus();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [instance.id, on]);

  const fetchQR = async () => {
    try {
      const data = await instanceApi.getQRCode(instance.id);
      if (data.qr_code) {
        setQrCode(data.qr_code);
        setLoading(false);
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    } catch {
      // QR not ready yet, keep polling
    }
  };

  // Generate QR code as an image using a simple canvas-free approach
  // We'll use Google Charts API for QR rendering (simple and reliable)
  const qrImageUrl = qrCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrCode)}`
    : '';

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
            <p>Instância <strong>{instance.name}</strong> está online.</p>
          </div>
        ) : (
          <>
            <div className="wa-qr-header">
              <QrCode size={28} className="text-[#25D366]" />
              <div>
                <h3>Conectar WhatsApp</h3>
                <p className="wa-qr-subtitle">{instance.name}</p>
              </div>
            </div>

            <div className="wa-qr-instructions">
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">1</span>
                <span>Abra o WhatsApp no celular</span>
              </div>
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">2</span>
                <span>Toque em <strong>Menu</strong> ou <strong>Configurações</strong></span>
              </div>
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">3</span>
                <span>Selecione <strong>Aparelhos Conectados</strong></span>
              </div>
              <div className="wa-qr-step">
                <span className="wa-qr-step-num">4</span>
                <span>Escaneie o código abaixo</span>
              </div>
            </div>

            <div className="wa-qr-container">
              {loading ? (
                <div className="wa-qr-loading">
                  <Loader2 size={40} className="animate-spin" />
                  <p>Gerando QR Code...</p>
                  <span>Aguarde alguns segundos</span>
                </div>
              ) : qrCode ? (
                <div className="wa-qr-image-wrapper">
                  <img
                    src={qrImageUrl}
                    alt="QR Code para WhatsApp"
                    className="wa-qr-image"
                  />
                  <div className="wa-qr-phone-icon">
                    <Smartphone size={24} className="text-[#25D366]" />
                  </div>
                </div>
              ) : (
                <div className="wa-qr-error">
                  <p>QR Code não disponível</p>
                  <button onClick={fetchQR} className="wa-qr-retry">
                    <RefreshCw size={14} /> Tentar novamente
                  </button>
                </div>
              )}
            </div>

            {qrCode && (
              <p className="wa-qr-note">
                O QR Code expira em 60 segundos. Um novo será gerado automaticamente.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QRCodeModal;
