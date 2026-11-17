import React, { useState } from 'react';
import { toast } from 'sonner';

export const AdminTicketsBoard = ({ initialTickets = [] }: { initialTickets?: any[] }) => {
  const [tickets] = useState<any[]>(initialTickets);
  const [filter, setFilter] = useState('open');
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);

  const filteredTickets = tickets.filter(
    (t) => t.status === filter || filter === 'all'
  );

  return (
    <div style={{ padding: '20px' }}>
      <h2>Painel de Assistência Técnica (Pós-Obra)</h2>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={() => setFilter('all')}
          style={btnStyle(filter === 'all')}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('open')}
          style={btnStyle(filter === 'open')}
        >
          Abertos
        </button>
        <button
          onClick={() => setFilter('inspection')}
          style={btnStyle(filter === 'inspection')}
        >
          Vistoria Agendada
        </button>
        <button
          onClick={() => setFilter('repairing')}
          style={btnStyle(filter === 'repairing')}
        >
          Em Reparo
        </button>
        <button
          onClick={() => setFilter('done')}
          style={btnStyle(filter === 'done')}
        >
          Concluídos
        </button>
      </div>

      <table
        style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}
      >
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
          {filteredTickets.map((ticket) => (
            <tr key={ticket.id} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '12px' }}>#{ticket.id.substring(0, 6)}</td>
              <td style={{ padding: '12px' }}>{ticket.subject}</td>
              <td style={{ padding: '12px' }}>{ticket.client_name}</td>
              <td style={{ padding: '12px' }}>{ticket.unit_label}</td>
              <td style={{ padding: '12px' }}>
                <span
                  style={{
                    color:
                      ticket.priority === 'high'
                        ? 'red'
                        : ticket.priority === 'medium'
                          ? 'orange'
                          : 'green',
                  }}
                >
                  {ticket.priority.toUpperCase()}
                </span>
              </td>
              <td style={{ padding: '12px' }}>{ticket.status}</td>
              <td style={{ padding: '12px' }}>
                <button
                  onClick={() => setSelectedTicket(ticket)}
                  style={{
                    padding: '6px 12px',
                    background: '#2196f3',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Visualizar
                </button>
              </td>
            </tr>
          ))}
          {filteredTickets.length === 0 && (
            <tr>
              <td
                colSpan={7}
                style={{ padding: '20px', textAlign: 'center', color: '#999' }}
              >
                Nenhum chamado encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedTicket && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '480px',
              width: '100%',
            }}
          >
            <h3 style={{ marginTop: 0 }}>Chamado #{String(selectedTicket.id).substring(0, 6)}</h3>
            <p><strong>Assunto:</strong> {selectedTicket.subject}</p>
            <p><strong>Cliente:</strong> {selectedTicket.client_name}</p>
            <p><strong>Unidade:</strong> {selectedTicket.unit_label}</p>
            <p><strong>Prioridade:</strong> {selectedTicket.priority}</p>
            <p><strong>Status:</strong> {selectedTicket.status}</p>
            {selectedTicket.description && (
              <p><strong>Descrição:</strong> {selectedTicket.description}</p>
            )}
            <button
              onClick={() => setSelectedTicket(null)}
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                background: '#111',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const btnStyle = (isActive) => ({
  padding: '8px 16px',
  background: isActive ? '#333' : '#e0e0e0',
  color: isActive ? '#fff' : '#333',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
});
