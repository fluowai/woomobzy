import React from 'react';
import { useParams } from 'react-router-dom';

const DossieView: React.FC = () => {
  const { id } = useParams();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 bg-slate-50 p-4 text-center">
      <div className="animate-pulse bg-slate-200 rounded-full h-16 w-16 mb-4 mx-auto"></div>
      <h2 className="text-xl font-bold mb-2">Dossiê Técnico</h2>
      <p>Gerador de dossiês técnicos e apresentações para o imóvel {id}.</p>
    </div>
  );
};

export default DossieView;
