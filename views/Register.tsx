import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { UserPlus, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();

  // Redirect or show message for single tenant
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-[2rem] shadow-2xl p-12 max-w-md text-center border border-slate-100">
        <div className="flex items-center justify-center mb-6">
          <div className="p-4 bg-slate-900 rounded-2xl">
             <AlertCircle size={32} className="text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-4">Acesso Restrito</h1>
        <p className="text-slate-500 mb-8">
          Este é um sistema privado. O cadastro de novos usuários é restrito à administração da imobiliária.
        </p>
        <Link 
          to="/login" 
          className="inline-block bg-slate-900 text-white px-8 py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
        >
          Voltar para Login
        </Link>
      </div>
    </div>
  );
};

export default Register;
