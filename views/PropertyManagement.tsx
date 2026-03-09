import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Filter, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  Grid, 
  List,
  ChevronDown,
  Loader2,
  Check,
  XCircle,
  Clock
} from 'lucide-react';
import { propertyService } from '../services/properties';
import { Property } from '../types';
import { useAuth } from '../context/AuthContext';

const PropertyManagement: React.FC = () => {
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const { profile } = useAuth(); 
  
  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await propertyService.list();
      setProperties(data);
    } catch (error) {
      console.error('Erro ao carregar imóveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este imóvel?')) {
      try {
        await propertyService.delete(id);
        setProperties(prev => prev.filter(p => p.id !== id));
      } catch (error) {
        alert('Erro ao excluir imóvel');
      }
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await propertyService.update(id, { status: 'Disponível' as any });
      alert('Imóvel aprovado com sucesso!');
      loadProperties();
    } catch (error) {
      alert('Erro ao aprovar imóvel');
    }
  };

  const filteredProperties = properties.filter(p => {
    if (activeTab === 'pending') return p.status === 'Pendente';
    return p.status !== 'Pendente';
  });

  if (loading) {
     return (
       <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
       </div>
     )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-black uppercase italic tracking-tighter">Gerenciamento de Imóveis</h1>
          <p className="text-black/60 font-medium">Gerencie todos os seus anúncios públicos e privados.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-slate-200 rounded-lg p-1">
            <button 
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-md transition-all ${viewType === 'grid' ? 'bg-slate-100 text-indigo-600' : 'text-black/40 hover:text-slate-600'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewType('list')}
              className={`p-2 rounded-md transition-all ${viewType === 'list' ? 'bg-slate-100 text-indigo-600' : 'text-black/40 hover:text-slate-600'}`}
            >
              <List size={18} />
            </button>
          </div>
          <button 
            onClick={() => navigate('/admin/properties/new')}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold transition-all shadow-md"
          >
            <Plus size={18} />
            Cadastrar Imóvel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-8 py-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'all' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-black/40 hover:text-slate-600'}`}
        >
          Meus Imoveis
        </button>
        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-black/40 hover:text-slate-600'}`}
        >
          Solicitações Externas
          {properties.filter(p => p.status === 'Pendente').length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full animate-pulse">
              {properties.filter(p => p.status === 'Pendente').length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título, bairro ou ID..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Tipo <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            Status <ChevronDown size={16} />
          </button>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filtros
          </button>
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
           <h3 className="text-lg font-bold text-slate-500">Nenhum imóvel encontrado</h3>
           <p className="text-sm text-black/40">
             {activeTab === 'pending' ? 'Não há solicitações pendentes no momento.' : 'Comece cadastrando seu primeiro imóvel.'}
           </p>
        </div>
      ) : (
      <>
      {/* Grid View */}
      {viewType === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-all">
              <div className="relative h-48">
                <img src={property.images?.[0] || 'https://via.placeholder.com/400x300?text=Sem+Foto'} alt={property.title} className="w-full h-full object-cover" />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  property.status === 'Disponível' ? 'bg-emerald-500 text-white' : 
                  property.status === 'Pendente' ? 'bg-orange-500 text-white' : 'bg-slate-500 text-white'
                }`}>
                  {property.status}
                </div>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{property.type}</span>
                  <h3 className="text-lg font-bold text-slate-900 truncate">{property.title}</h3>
                  <p className="text-sm text-slate-500 truncate">{property.location.neighborhood}, {property.location.city}</p>
                </div>
                <div className="flex items-center justify-between mb-6">
                  <span className="text-xl font-extrabold text-slate-900">
                    {property.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <div className="flex items-center gap-1 text-black/40 text-sm">
                    <span>{property.features.areaHectares} ha</span>
                    <span>•</span>
                    <span>{property.features.tipoSolo}</span>
                  </div>
                </div>
                 <div className="flex items-center gap-2 border-t border-slate-50 pt-4">
                  {property.status === 'Pendente' ? (
                    <>
                      <button 
                        onClick={() => handleApprove(property.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm font-bold transition-colors"
                      >
                        <Check size={16} /> Aprovar
                      </button>
                      <button 
                         onClick={() => handleDelete(property.id!)}
                         className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                      >
                        <XCircle size={16} /> Recusar
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => navigate(`/admin/properties/${property.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-semibold transition-colors"
                      >
                        <Edit3 size={16} /> Editar
                      </button>
                      <button 
                        onClick={() => navigate(`/property/${property.id}`)}
                        className="p-2 text-black/40 hover:text-indigo-600 transition-colors"
                        title="Ver página pública"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(property.id!)}
                        className="p-2 text-black/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View (Simplified) */
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Imóvel</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Localização</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProperties.map((property) => (
                <tr key={property.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={property.images?.[0] || 'https://via.placeholder.com/400x300?text=Sem+Foto'} className="w-12 h-12 rounded-lg object-cover" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{property.title}</p>
                        <p className="text-xs text-black/40">ID: {property.id?.slice(0, 8)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {property.location.neighborhood}, {property.location.city}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {property.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                      property.status === 'Disponível' ? 'bg-emerald-100 text-emerald-700' : 
                      property.status === 'Pendente' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {property.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/admin/properties/${property.id}`)}
                        className="p-1.5 text-black/40 hover:text-indigo-600 transition-colors"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                         onClick={() => handleDelete(property.id!)}
                         className="p-1.5 text-black/40 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default PropertyManagement;
