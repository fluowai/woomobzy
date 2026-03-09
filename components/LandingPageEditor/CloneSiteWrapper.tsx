
import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { landingPageService } from '../../services/landingPages';
import { LandingPageStatus } from '../../types/landingPage';
import AICloneModal from './AICloneModal';

// ============================================
// CLONE MODAL WRAPPER
// ============================================

const CloneSiteWrapper: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { user } = useAuth();
  
  const handleCloneApply = async (layoutConfig: any) => {
    if (!user?.id || !user?.organizationId) {
      alert('Erro: usuário não autenticado');
      return;
    }

    try {
      const timestamp = Date.now();
      const slug = `site-clonado-${timestamp}`;
      
      const newPage = await landingPageService.create({
        organizationId: user.organizationId,
        userId: user.id,
        name: `Site Clonado ${new Date().toLocaleTimeString()}`,
        slug: slug,
        title: 'Site Clonado',
        templateId: 'cloned',
        themeConfig: {
            primaryColor: '#2563eb',
            secondaryColor: '#10b981',
            backgroundColor: '#ffffff',
            textColor: '#111827',
            fontFamily: 'Inter',
            fontSize: { base: '16px', heading1: '48px', heading2: '36px', heading3: '24px' },
            borderRadius: '8px',
            spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' }
        },
        blocks: layoutConfig.blocks.map((b: any, index: number) => ({
          ...b,
           id: `block_${timestamp}_${index}`,
           order: index,
           visible: true,
           config: b.config || {}, 
           styles: b.styles || {},
           responsive: b.responsive || {} 
        })),
        settings: {
          headerStyle: 'transparent',
          footerStyle: 'minimal',
          showBranding: true
        },
        propertySelection: {
          mode: 'manual' as any,
          propertyIds: [],
          filters: {},
          sortBy: 'price',
          limit: 12
        },
        formConfig: {
          enabled: true,
          fields: ['name', 'email', 'phone', 'message'],
          submitText: 'Enviar',
          successMessage: 'Enviado!',
          whatsappEnabled: true,
          emailEnabled: true
        },
        status: LandingPageStatus.DRAFT
      });

      window.location.href = `/admin/landing-pages/${newPage.id}`;

    } catch (error) {
      console.error('Erro ao criar página clonada:', error);
      alert('Erro ao salvar página clonada');
    }
  };

  return (
    <AICloneModal 
      onClose={onClose}
      onClone={handleCloneApply}
    />
  );
};

export default CloneSiteWrapper;
