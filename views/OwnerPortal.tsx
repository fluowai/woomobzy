import React from 'react';

const OwnerPortal: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 bg-slate-50 p-4 text-center">
      <div className="animate-pulse bg-slate-200 rounded-full h-16 w-16 mb-4 mx-auto"></div>
      <h2 className="text-xl font-bold mb-2">Portal do Proprietário</h2>
      <p>
        Área exclusiva para proprietários acompanharem seus imóveis em
        desenvolvimento.
      </p>
    </div>
  );
};

export default OwnerPortal;
