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
  Circle,
  Clock,
  MapPin,
  Map,
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
    if (profile?.organization_id) {
      loadProperties();
    }
  }, [profile?.organization_id]);

  const loadProperties = async () => {
    try {
      setLoading(true);
      if (!profile?.organization_id) {
        console.warn(
          '❌ Cannot load properties: No organization ID in profile'
        );
        return;
      }
      const data = await propertyService.list(profile.organization_id);
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
        setProperties((prev) => prev.filter((p) => p.id !== id));
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

  const filteredProperties = properties.filter((p) => {
    if (activeTab === 'pending') return p.status === 'Pendente';
    return p.status !== 'Pendente';
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="h1 mb-2">Gerenciamento de Imóveis</h1>
          <p className="body text-text-secondary">
            Gerencie todos os seus anúncios públicos e privados com facilidade.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-bg-card border border-border-subtle rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setViewType('grid')}
              className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setViewType('list')}
              className={`p-2 rounded-lg transition-all ${viewType === 'list' ? 'bg-primary text-white shadow-lg' : 'text-text-tertiary hover:text-text-primary'}`}
            >
              <List size={20} />
            </button>
          </div>
          <button
            onClick={() => navigate('new')}
            className="btn btn-primary h-12 px-6 shadow-lg shadow-primary-alpha-20"
          >
            <Plus size={20} />
            Cadastrar Imóvel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-8 py-4 text-sm font-bold border-b-2 transition-all tracking-wide ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}
        >
          Meus Imóveis
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-8 py-4 text-sm font-bold border-b-2 transition-all flex items-center gap-3 tracking-wide ${activeTab === 'pending' ? 'border-primary text-primary' : 'border-transparent text-text-tertiary hover:text-text-primary'}`}
        >
          Solicitações Externas
          {properties.filter((p) => p.status === 'Pendente').length > 0 && (
            <span className="bg-accent text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-accent/20">
              {properties.filter((p) => p.status === 'Pendente').length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card p-4 flex flex-col lg:flex-row gap-4 items-center bg-bg-card/50 backdrop-blur-md">
        <div className="flex-1 relative w-full group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary group-focus-within:text-primary transition-colors"
            size={18}
          />
          <input
            type="text"
            placeholder="Buscar por título, bairro ou ID..."
            className="input-field pl-12"
          />
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">
            Tipo <ChevronDown size={14} />
          </button>
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">
            Status <ChevronDown size={14} />
          </button>
          <button className="btn btn-secondary flex-1 lg:flex-none h-11 px-4 text-xs uppercase tracking-widest font-bold">
            <Filter size={14} />
            Filtros
          </button>
        </div>
      </div>

      {filteredProperties.length === 0 ? (
        <div className="text-center py-24 card border-dashed border-border-subtle bg-transparent">
          <h3 className="h3 text-text-tertiary mb-2">
            Nenhum imóvel encontrado
          </h3>
          <p className="body text-text-tertiary max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'Não há solicitações pendentes no momento. Continue o bom trabalho!'
              : 'Comece sua jornada cadastrando seu primeiro imóvel no sistema imobzy.'}
          </p>
        </div>
      ) : (
        <>
          {/* Grid View */}
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProperties.map((property) => (
                <div
                  key={property.id}
                  className="card card-hover overflow-hidden group animate-slide-up"
                >
                  <div className="relative h-56 -mx-6 -mt-6 mb-6 overflow-hidden">
                    <img
                      src={
                        property.images?.[0] ||
                        'https://images.unsplash.com/photo-1500382017468-9049fee74a62?auto=format&fit=crop&q=80&w=800'
                      }
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-lg ${
                        property.status === 'Disponível'
                          ? 'bg-emerald-500 text-white'
                          : property.status === 'Pendente'
                            ? 'bg-accent text-black'
                            : 'bg-text-tertiary text-white'
                      }`}
                    >
                      {property.status}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      <div>
                        <span className="badge badge-primary mb-2">
                          {property.type}
                        </span>
                        <h3 className="text-lg font-bold text-text-primary truncate mb-1">
                          {property.title}
                        </h3>
                        <p className="text-sm text-text-tertiary truncate flex items-center gap-1">
                          <MapPin size={12} /> {property.location.neighborhood},{' '}
                          {property.location.city}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black text-primary">
                          {property.price.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </span>
                        <div className="flex items-center gap-2 text-text-tertiary text-xs font-bold uppercase tracking-wider">
                          <span>{property.features.areaHectares} ha</span>
                          <span className="w-1 h-1 bg-text-tertiary rounded-full" />
                          <span>{property.features.tipoSolo}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 border-t border-border-subtle pt-6 mt-2">
                        {property.status === 'Pendente' ? (
                          <>
                            <button
                              onClick={() => handleApprove(property.id)}
                              className="btn-primary flex-1 h-10 text-xs uppercase tracking-widest"
                            >
                              <Check size={14} /> Aprovar
                            </button>
                            <button
                              onClick={() => handleDelete(property.id!)}
                              className="btn-secondary flex-1 h-10 text-xs uppercase tracking-widest text-red-400 hover:text-red-500"
                            >
                              <Trash2 size={14} /> Recusar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => navigate(`${property.id}`)}
                              className="btn btn-secondary flex-1 h-10 text-xs uppercase tracking-widest font-bold"
                            >
                              <Edit3 size={14} /> Editar
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/property/${property.id}`)
                              }
                              className="p-2 text-text-tertiary hover:text-primary transition-colors bg-bg-hover rounded-lg"
                              title="Ver página pública"
                            >
                              <Eye size={18} />
                            </button>
                            <button
                              onClick={() => handleDelete(property.id!)}
                              className="p-2 text-text-tertiary hover:text-red-500 transition-colors bg-bg-hover rounded-lg"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}
                      </div>
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
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Imóvel
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Localização
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredProperties.map((property) => (
                    <tr
                      key={property.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              property.images?.[0] ||
                              'https://via.placeholder.com/400x300?text=Sem+Foto'
                            }
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {property.title}
                            </p>
                            <p className="text-xs text-black/40">
                              ID: {property.id?.slice(0, 8)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {property.location.neighborhood},{' '}
                        {property.location.city}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {property.price.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            property.status === 'Disponível'
                              ? 'bg-emerald-100 text-emerald-700'
                              : property.status === 'Pendente'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {property.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              navigate(`${property.id}`)
                            }
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
