import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Impersonation Components
import ImpersonateCallback from './views/ImpersonateCallback';
import ImpersonationBanner from './components/ImpersonationBanner';

// Layouts & Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import TrackingPixels from './components/TrackingPixels';

// Views
import LandingPage from './views/LandingPage';
import Login from './views/Login';
import Register from './views/Register';
import AdminDashboard from './views/AdminDashboard';

// Admin Views
import PropertyManagement from './views/PropertyManagement';
import PropertyEditor from './views/PropertyEditor';
import LandingPageManager from './views/LandingPageManager';
import LandingPageEditor from './views/LandingPageEditor';
import TextsManager from './views/TextsManager';
import AIAssistant from './views/AIAssistant';
import Migration from './views/Migration';
import SystemSettings from './views/SystemSettings';
import PublicLandingPage from './views/PublicLandingPage';
import DataRoom from './views/DataRoom';
import OwnerPortal from './views/OwnerPortal';
import DossieView from './views/DossieView';
// import SetupWizard from './views/SetupWizard';
import Onboarding from './views/Onboarding';

// Super Admin
import SuperAdminLayout from './views/superadmin/SuperAdminLayout';
import SuperAdminDashboard from './views/superadmin/Dashboard';
import TenantManager from './views/superadmin/TenantManager';
import GlobalSettings from './views/superadmin/GlobalSettings';
import DomainManager from './views/superadmin/DomainManager';
import PlanManager from './views/superadmin/PlanManager';

// CRM
import KanbanBoard from './views/CRM/KanbanBoard';
import Messages from './views/admin/Messages';
import WhatsAppSetup from './views/admin/WhatsAppSetup';

// Placeholder for missing/WIP views
import BIRural from './views/BIRural';
import LegalContracts from './views/LegalContracts';

import { SettingsProvider, useSettings } from './context/SettingsContext';
import { AuthProvider } from './context/AuthContext';
import { TextsProvider } from './context/TextsContext';
import { PlansProvider } from './context/PlansContext';
import DomainRouter from './components/DomainRouter';

console.log('App.tsx: Module Executing (CRM Enabled)');

const Placeholder: React.FC<{ name: string }> = ({ name }) => (
  <div className="flex flex-col items-center justify-center min-h-screen text-slate-500 bg-slate-50 p-4 text-center">
    <div className="animate-pulse bg-slate-200 rounded-full h-16 w-16 mb-4 mx-auto"></div>
    <h2 className="text-xl font-bold mb-2">Em Breve: {name}</h2>
    <p>Funcionalidade em desenvolvimento.</p>
  </div>
);


const AppContent: React.FC = () => {
  const { settings, loading } = useSettings();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
    <ImpersonationBanner />
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/impersonate" element={<ImpersonateCallback />} />
      <Route path="/lp/:slug" element={<PublicLandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/onboarding" element={<Onboarding />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><Layout><AdminDashboard /></Layout></ProtectedRoute>} />
      
      {/* Properties */}
      <Route path="/admin/properties" element={<ProtectedRoute><Layout><PropertyManagement /></Layout></ProtectedRoute>} />
      <Route path="/admin/properties/new" element={<ProtectedRoute><Layout><PropertyEditor /></Layout></ProtectedRoute>} />
      <Route path="/admin/properties/:id" element={<ProtectedRoute><Layout><PropertyEditor /></Layout></ProtectedRoute>} />
      
      {/* Landing Pages */}
      <Route path="/admin/landing-pages" element={<ProtectedRoute><Layout><LandingPageManager /></Layout></ProtectedRoute>} />
      <Route path="/admin/landing-pages/new" element={<ProtectedRoute><Layout><LandingPageEditor /></Layout></ProtectedRoute>} />
      <Route path="/admin/landing-pages/:id" element={<ProtectedRoute><Layout><LandingPageEditor /></Layout></ProtectedRoute>} />

      {/* Texts Editor */}
      <Route path="/admin/texts" element={<ProtectedRoute><Layout><TextsManager /></Layout></ProtectedRoute>} />
      
      {/* CRM */}
      <Route path="/admin/crm" element={<ProtectedRoute><Layout><KanbanBoard /></Layout></ProtectedRoute>} />

      {/* Messages & Setup */}
      <Route path="/admin/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
      <Route path="/admin/whatsapp-setup" element={<ProtectedRoute><Layout><WhatsAppSetup /></Layout></ProtectedRoute>} />

      {/* Tools */}
      <Route path="/admin/ai-assistant" element={<ProtectedRoute><Layout><AIAssistant /></Layout></ProtectedRoute>} />
      <Route path="/admin/migration" element={<ProtectedRoute><Layout><Migration /></Layout></ProtectedRoute>} />
      
      {/* Other modules */}
      <Route path="/admin/agenda" element={<ProtectedRoute><Layout><Placeholder name="Agenda" /></Layout></ProtectedRoute>} />
      <Route path="/admin/contracts" element={<ProtectedRoute><Layout><LegalContracts /></Layout></ProtectedRoute>} />
      <Route path="/admin/reports" element={<ProtectedRoute><Layout><BIRural /></Layout></ProtectedRoute>} />
      <Route path="/admin/dataroom" element={<ProtectedRoute><Layout><DataRoom /></Layout></ProtectedRoute>} />
      <Route path="/admin/owner-portal" element={<ProtectedRoute><Layout><OwnerPortal /></Layout></ProtectedRoute>} />
      <Route path="/admin/properties/:id/dossie" element={<ProtectedRoute><Layout><DossieView /></Layout></ProtectedRoute>} />

      {/* Settings */}
      <Route path="/admin/settings" element={<ProtectedRoute><Layout><SystemSettings /></Layout></ProtectedRoute>} />

      
      {/* Setup */}
      {/* <Route path="/admin/setup" element={<ProtectedRoute><Layout><SetupWizard /></Layout></ProtectedRoute>} /> */}

      {/* Super Admin Routes (Deprecated - Moved to Settings) */}
      {/* 
      <Route path="/superadmin" element={<ProtectedRoute><SuperAdminLayout /></ProtectedRoute>}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="tenants" element={<TenantManager />} />
          <Route path="domains" element={<DomainManager />} />
          <Route path="plans" element={<PlanManager />} />
          <Route path="settings" element={<GlobalSettings />} />
      </Route> 
      */}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <SettingsProvider>
          <TextsProvider>
            <PlansProvider>
              <DomainRouter>
                <TrackingPixels />
                <AppContent />
              </DomainRouter>
            </PlansProvider>
          </TextsProvider>
        </SettingsProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
