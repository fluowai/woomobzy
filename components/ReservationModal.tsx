import React, { useState } from 'react';

export const ReservationModal = ({ unit, onClose, onConfirm }) => {
  const [leadId, setLeadId] = useState('');

  return (
    <div className="modal-overlay" style={overlayStyle}>
      <div className="modal-content" style={contentStyle}>
        <h3>Reservar Unidade {unit.label}</h3>
        <p>A unidade ficará bloqueada para outros corretores por 24 horas.</p>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>ID do Lead (Cliente):</label>
          <input 
            type="text" 
            value={leadId} 
            onChange={(e) => setLeadId(e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            placeholder="Ex: UUID-do-cliente"
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={btnCancelStyle}>Cancelar</button>
          <button 
            onClick={() => onConfirm(leadId)} 
            disabled={!leadId}
            style={leadId ? btnConfirmStyle : { ...btnConfirmStyle, opacity: 0.5 }}
          >
            Confirmar Reserva
          </button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1000
};

const contentStyle = {
  background: '#fff',
  padding: '20px',
  borderRadius: '8px',
  width: '400px',
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
};

const btnCancelStyle = {
  padding: '8px 16px',
  background: '#e0e0e0',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};

const btnConfirmStyle = {
  padding: '8px 16px',
  background: '#4caf50',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
};
