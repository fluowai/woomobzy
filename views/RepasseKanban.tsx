import React, { useState } from 'react';

const columns = [
  { id: 'analysis', title: 'Análise de Crédito' },
  { id: 'engineering', title: 'Avaliação de Engenharia' },
  { id: 'contract', title: 'Emissão de Contrato' },
  { id: 'released', title: 'Recurso Liberado' },
];

export const RepasseKanban = ({ initialTransfers = [] }) => {
  const [transfers, setTransfers] = useState(initialTransfers);

  const handleDragStart = (e, transferId) => {
    e.dataTransfer.setData('transferId', transferId);
  };

  const handleDrop = (e, columnId) => {
    const transferId = e.dataTransfer.getData('transferId');
    setTransfers((prev) =>
      prev.map((t) => (t.id === transferId ? { ...t, status: columnId } : t))
    );
  };

  return (
    <div
      className="repasse-kanban"
      style={{
        display: 'flex',
        gap: '20px',
        padding: '20px',
        overflowX: 'auto',
      }}
    >
      {columns.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, col.id)}
          style={{
            flex: '0 0 300px',
            background: '#f4f5f7',
            borderRadius: '8px',
            padding: '16px',
            minHeight: '400px',
          }}
        >
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#333' }}>
            {col.title}
          </h3>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            {transfers
              .filter((t) => t.status === col.id)
              .map((transfer) => (
                <div
                  key={transfer.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, transfer.id)}
                  style={{
                    background: '#fff',
                    padding: '12px',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    cursor: 'grab',
                  }}
                >
                  <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                    {transfer.clientName}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Valor: R$ {transfer.amount.toLocaleString()}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#999',
                      marginTop: '8px',
                    }}
                  >
                    Banco: {transfer.bank_name}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
