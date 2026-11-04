import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona imediatamente para o fluxo de onboarding global
    navigate('/onboarding', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 font-medium">
          Redirecionando para o cadastro...
        </p>
      </div>
    </div>
  );
};

export default Register;
