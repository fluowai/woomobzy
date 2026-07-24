import React, { useState } from 'react';

export const AdminTicketsBoard = ({ initialTickets = [] }) => {
  const [tickets, setTickets] = useState(initialTickets);
  const [filter, setFilter] = useState('open');

  const filteredTickets = tickets.filter(t => t.status === filter || filter === 'all');

  return (
    <div style={{ padding: '20px' }}>
      <h2>Painel de Assistência Técnica (Pós-Obra)</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button onClick={() => setFilter('all')} style={btnStyle(filter === 'all')}>Todos</button>
        <button onClick={() => setFilter('open')} style={btnStyle(filter === 'open')}>Abertos</button>
        <button onClick={() => setFilter('inspection')} style={btnStyle(filter === 'inspection')}>Vistoria Agendada</button>
        <button onClick={() => setFilter('repairing')} style={btnStyle(filter === 'repairing')}>Em Reparo</button>
        <button onClick={() => setFilter('done')} style={btnStyle(filter === 'done')}>Concluídos</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ddd' }}>
            <th style={{ padding: '12px' }}>ID</th>
            <th style={{ padding: '12px' }}>Assunto</th>
            <th style={{ padding: '12px' }}>Cliente</th>
            <th style={{ padding: '12px' }}>Propriedade/Unidade</th>
            <th style={{ padding: '12px' }}>Prioridade</th>
            <th style={{ padding: '12px' }}>Status</th>
            <th style={{ padding: '12px' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredTickets.map(ticket => (
            <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>#{ticket.id.substring(0,6)}</td>
              <td style={{ padding: '12px' }}>{ticket.subject}</td>
              <td style={{ padding: '12px' }}>{ticket.client_name}</td>
              <td style={{ padding: '12px' }}>{ticket.unit_label}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ 
                  color: ticket.priority === 'high' ? 'red' : ticket.priority === 'medium' ? 'orange' : 'green' 
                }}>
                  {ticket.priority.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '12px' }}>{ticket.status}</td>
              <td style={{ padding: '12px' }}>
                <button style={{ padding: '6px 12px', background: '#2196f3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Visualizar
                </button>
              </td>
            </tr>
          ))}
          {filteredTickets.length === 0 && (
            <tr>
              <td colSpan="7" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                Nenhum chamado encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

const btnStyle = (isActive) => ({
  padding: '8px 16px',
  background: isActive ? '#333' : '#e0e0e0',
  color: isActive ? '#fff' : '#333',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
});
