import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Camera, FileCheck, CheckCircle2, MessageSquare, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { callApi } from '@/src/lib/api';

export function SignaturePortal() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [agreed, setAgreed] = useState(false);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [documentImg, setDocumentImg] = useState<string | null>(null);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [finalPdf, setFinalPdf] = useState<string | null>(null);
  const [whatsappCode, setWhatsappCode] = useState('');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const response = await callApi(`api/locacao/internal-signature/document/${token}`);
        if (response.success) {
          setData(response);
          // Try to get location early
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              (err) => console.warn('Location denied', err)
            );
          }
        } else {
          toast.error(response.error || 'Erro ao carregar documento');
        }
      } catch (e) {
        toast.error('Erro de conexão');
      } finally {
        setLoading(false);
      }
    }
    if (token) loadData();
  }, [token]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      toast.error('Não foi possível acessar a câmera');
    }
  };

  const takePhoto = (type: 'selfie' | 'document') => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg');
        if (type === 'selfie') setSelfie(dataUrl);
        else setDocumentImg(dataUrl);
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSign = async () => {
    if (!selfie || !documentImg || !agreed || !whatsappCode) {
      toast.error('Complete todas as etapas antes de assinar.');
      return;
    }
    
    setIsSigning(true);
    try {
      const res = await callApi(`api/locacao/internal-signature/sign/${token}`, {
        method: 'POST',
        body: JSON.stringify({
          ip: '0.0.0.0', // idealmente pego no backend via req.ip
          lat: location?.lat || null,
          lng: location?.lng || null,
          selfieUrl: selfie,
          documentUrl: documentImg,
          code: whatsappCode
        })
      });

      if (res.success) {
        setFinalPdf(res.url);
        setStep(5);
        toast.success('Documento assinado com sucesso!');
      } else {
        throw new Error(res.error);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao assinar');
    } finally {
      setIsSigning(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Carregando documento...</div>;
  if (!data) return <div className="flex h-screen items-center justify-center text-red-500">Documento inválido ou já assinado.</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white p-4 shadow-sm border-b flex items-center justify-center gap-2">
        <ShieldCheck className="w-6 h-6 text-emerald-600" />
        <h1 className="font-bold text-gray-800 text-lg">Assinatura Digital Segura</h1>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full p-4 flex flex-col gap-6 mt-4">
        
        {/* Step 1: Review Document */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">1. Revisar Documento</h2>
            <div className="bg-gray-100 rounded-lg h-96 overflow-hidden relative border border-gray-300">
               <iframe src={data.documentUrl} className="w-full h-full" title="Contrato" />
            </div>
            <div className="mt-6 flex items-center gap-3">
              <input type="checkbox" id="agree" className="w-5 h-5 accent-emerald-600" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              <label htmlFor="agree" className="text-sm font-medium text-gray-700">Eu li e concordo com os termos do contrato.</label>
            </div>
            <button 
              disabled={!agreed}
              onClick={() => { setStep(2); startCamera(); }}
              className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white py-3 rounded-lg font-bold"
            >
              Avançar para Identificação
            </button>
          </div>
        )}

        {/* Step 2: Selfie */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <h2 className="text-xl font-bold mb-2">2. Validação Facial</h2>
            <p className="text-gray-500 text-sm mb-6">Precisamos de uma selfie para garantir sua identidade.</p>
            
            <div className="mx-auto w-64 h-64 bg-gray-100 rounded-full overflow-hidden relative border-4 border-emerald-100 mb-6">
              {!selfie ? (
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
              ) : (
                <img src={selfie} className="w-full h-full object-cover" alt="Selfie" />
              )}
            </div>
            
            <canvas ref={canvasRef} className="hidden" />

            {!selfie ? (
              <button onClick={() => takePhoto('selfie')} className="bg-emerald-600 text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 mx-auto">
                <Camera className="w-5 h-5" /> Tirar Foto
              </button>
            ) : (
              <div className="flex gap-4 justify-center">
                <button onClick={() => { setSelfie(null); startCamera(); }} className="text-gray-500 font-medium">Tentar Novamente</button>
                <button onClick={() => { setStep(3); startCamera(); }} className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold">Avançar</button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Document ID */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 text-center">
            <h2 className="text-xl font-bold mb-2">3. Foto do Documento</h2>
            <p className="text-gray-500 text-sm mb-6">Tire uma foto legível do seu RG ou CNH (Frente e Verso).</p>
            
            <div className="mx-auto w-full max-w-sm h-48 bg-gray-100 rounded-xl overflow-hidden relative border-2 border-dashed border-gray-300 mb-6">
              {!documentImg ? (
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
              ) : (
                <img src={documentImg} className="w-full h-full object-cover" alt="Document" />
              )}
            </div>

            {!documentImg ? (
              <button onClick={() => takePhoto('document')} className="bg-emerald-600 text-white px-6 py-3 rounded-full font-bold flex items-center justify-center gap-2 mx-auto">
                <FileCheck className="w-5 h-5" /> Fotografar Documento
              </button>
            ) : (
              <div className="flex gap-4 justify-center">
                <button onClick={() => { setDocumentImg(null); startCamera(); }} className="text-gray-500 font-medium">Tentar Novamente</button>
                <button onClick={() => setStep(4)} className="bg-emerald-600 text-white px-6 py-2 rounded-full font-bold">Avançar</button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: WhatsApp Code & Geolocation & Sign */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-xl font-bold mb-4">4. Assinatura Final</h2>
            
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6 flex gap-3">
              <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
              <div className="text-sm text-blue-900">
                Sua localização e IP serão registrados no documento para validade jurídica.
                {location ? ' Localização obtida com sucesso.' : ' Buscando localização...'}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Código de Validação (WhatsApp)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={whatsappCode}
                  onChange={e => setWhatsappCode(e.target.value)}
                  placeholder="Ex: 123456"
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                />
                <button className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Reenviar
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">Você recebeu um código no número cadastrado.</p>
            </div>

            <button 
              onClick={handleSign}
              disabled={isSigning || !whatsappCode}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              {isSigning ? 'Assinando e gerando chaves PKI...' : 'Assinar Documento Digitalmente'}
            </button>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && (
          <div className="bg-white rounded-xl shadow-sm p-8 border border-emerald-200 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-emerald-800 mb-2">Assinatura Concluída!</h2>
            <p className="text-gray-600 mb-6">O documento foi assinado criptograficamente com sucesso. Seu IP, Selfie e Geolocalização foram registrados.</p>
            
            <a 
              href={finalPdf || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-bold w-full max-w-xs block"
            >
              Baixar Documento Assinado
            </a>
          </div>
        )}

      </main>
    </div>
  );
}
