import React, { useState, useEffect } from 'react';
import { X, Search, Check } from 'lucide-react';
import { useProperties } from '../../src/hooks/useProperties';
import { useAuth } from '../../context/AuthContext';

interface PropertySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onSave: (ids: string[]) => void;
}

export const PropertySelectorModal: React.FC<PropertySelectorModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  onSave,
}) => {
  const { profile } = useAuth();
  const orgId = profile?.organization_id || '';
  const { properties, loading } = useProperties({
    organizationId: orgId,
    limit: 100, // Fetch up to 100 for manual selection
  });

  const [currentSelection, setCurrentSelection] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Sync prop to state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentSelection(selectedIds || []);
    }
  }, [isOpen, selectedIds]);

  if (!isOpen) return null;

  const filteredProperties = properties.filter(
    (p) =>
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelection = (id: string) => {
    setCurrentSelection((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onSave(currentSelection);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Selecionar Imóveis
            </h2>
            <p className="text-sm text-slate-500">
              Escolha os imóveis que deseja exibir na grade
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por título ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-slate-50">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              Nenhum imóvel encontrado.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProperties.map((property) => {
                const isSelected = currentSelection.includes(property.id);
                return (
                  <div
                    key={property.id}
                    onClick={() => toggleSelection(property.id)}
                    className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-600 shadow-md ring-2 ring-indigo-600 ring-opacity-20'
                        : 'border-transparent shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="h-32 bg-slate-200 relative">
                      {property.images?.[0] ? (
                        <img
                          src={property.images[0]}
                          alt={property.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          Sem foto
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-xs text-slate-900 truncate">
                        {property.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 truncate mt-1">
                        {property.city} - {property.state}
                      </p>
                      <p className="text-xs font-bold text-indigo-600 mt-2">
                        {property.price?.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-sm font-medium text-slate-600">
            {currentSelection.length} imóvel(is) selecionado(s)
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              Confirmar Seleção
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
