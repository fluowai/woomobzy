import React, { useState } from 'react';
import { ReservationModal } from './ReservationModal';

export const InteractiveUnitMap = ({ units, onReserve }) => {
  const [selectedUnit, setSelectedUnit] = useState(null);

  const getFillColor = (status) => {
    switch(status) {
      case 'available': return '#4caf50'; // Green
      case 'reserved': return '#ff9800'; // Orange
      case 'sold': return '#f44336'; // Red
      default: return '#9e9e9e'; // Grey
    }
  };

  return (
    <div className="interactive-map-container" style={{ position: 'relative', width: '100%', maxWidth: '800px' }}>
      <svg viewBox="0 0 800 600" style={{ width: '100%', height: 'auto', border: '1px solid #ccc' }}>
        {/* Placeholder SVG map logic */}
        {units.map((unit, index) => {
          const x = (index % 4) * 150 + 50;
          const y = Math.floor(index / 4) * 150 + 50;
          
          return (
            <g key={unit.id} onClick={() => setSelectedUnit(unit)} style={{ cursor: 'pointer' }}>
              <rect x={x} y={y} width="100" height="100" fill={getFillColor(unit.status)} rx="8" />
              <text x={x + 50} y={y + 50} textAnchor="middle" fill="#fff" dominantBaseline="middle" fontSize="16px">
                {unit.label}
              </text>
            </g>
          );
        })}
      </svg>
      
      {selectedUnit && selectedUnit.status === 'available' && (
        <ReservationModal 
          unit={selectedUnit} 
          onClose={() => setSelectedUnit(null)} 
          onConfirm={(leadId) => {
            onReserve(selectedUnit.id, leadId);
            setSelectedUnit(null);
          }}
        />
      )}
    </div>
  );
};
