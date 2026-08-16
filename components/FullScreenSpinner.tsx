import React from 'react';

const FullScreenSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg-primary animate-fade-in">
    <div className="text-center">
      <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      <p className="mt-4 text-text-secondary font-medium tracking-wide">
        Carregando...
      </p>
    </div>
  </div>
);

export default FullScreenSpinner;
