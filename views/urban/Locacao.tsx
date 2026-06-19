import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { LeaseDashboard } from '../../src/components/lease/LeaseDashboard';
import { LeaseWizard } from '../../src/components/lease/LeaseWizard';
import { LeaseDetail } from '../../src/components/lease/LeaseDetail';
import { TemplateList } from '../../src/components/lease/templates/TemplateList';
import { TemplateEditor } from '../../src/components/lease/templates/TemplateEditor';

const Locacao: React.FC = () => {
  return (
    <Routes>
      <Route index element={<LeaseDashboard />} />
      <Route path="novo" element={
        <LeaseWizard
          onComplete={() => window.history.pushState({}, '', '/urban/locacao')}
          onCancel={() => window.history.pushState({}, '', '/urban/locacao')}
        />
      } />
      <Route path=":id" element={<LeaseDetail />} />
      <Route path=":id/editar" element={
        <LeaseWizard
          onComplete={() => window.history.back()}
          onCancel={() => window.history.back()}
        />
      } />
      <Route path="templates" element={<TemplateList />} />
      <Route path="templates/novo" element={<TemplateEditor />} />
      <Route path="templates/:id" element={<TemplateEditor />} />
    </Routes>
  );
};

export default Locacao;
