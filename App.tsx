import React, { Suspense } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import DomainRouter from './components/DomainRouter';
import ImpersonationBanner from './components/ImpersonationBanner';
import TrackingPixels from './components/TrackingPixels';

import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { TextsProvider } from './context/TextsContext';
import { PlansProvider } from './context/PlansContext';

import FullScreenSpinner from './components/FullScreenSpinner';
import AppRoutes from './App.routes';

const AppContent: React.FC = () => {
  const { loading } = useSettings();

  if (loading) return <FullScreenSpinner />;

  return <AppRoutes />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <DomainRouter>
            <SettingsProvider>
              <TextsProvider>
                <PlansProvider>
                  <TrackingPixels />
                  <AppContent />
                </PlansProvider>
              </TextsProvider>
            </SettingsProvider>
          </DomainRouter>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
