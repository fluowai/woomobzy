import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import DomainRouter from './components/DomainRouter';

import TrackingPixels from './components/TrackingPixels';

import { SettingsProvider } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { TextsProvider } from './context/TextsContext';
import { PlansProvider } from './context/PlansContext';

import AppRoutes from './App.routes';

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
                  <AppRoutes />
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
