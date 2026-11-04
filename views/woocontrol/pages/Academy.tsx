import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, BookOpen, Plus, X, Trash2, Edit } from 'lucide-react';
import { fetchWooAcademy, createWooAcademy, updateWooAcademy, deleteWooAcademy } from '../../../services/wooControl';

export const Academy = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'DRAFT',
    curriculum: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadCourses = () => {
    setLoading(true);
    fetchWooAcademy()
      .then((c) => {
        setCourses(c);
        setError(null);
      })
      .catch((e: any) => {
        setError(e.message || 'Falha ao carregar cursos');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const openModal = (course?: any) => {
    setFormError(null);
    if (course) {
      setEditingCourse(course);
      setFormData({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        status: String(course.status || 'DRAFT').toUpperCase(),
        curriculum: course.curriculum || ''
      });
    } else {
      setEditingCourse(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        status: 'DRAFT',
        curriculum: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCourse(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        status: formData.status,
        curriculum: formData.curriculum
      };
      if (editingCourse) {
        await updateWooAcademy(editingCourse.id, payload);
      } else {
        await createWooAcademy(payload);
      }
      closeModal();
      loadCourses();
    } catch (err: any) {
      setFormError(err.message || 'Ocorreu um erro ao salvar o curso');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o curso "${title}"?`)) {
      try {
        await deleteWooAcademy(id);
        loadCourses();
      } catch (err: any) {
        alert(err.message || 'Erro ao excluir o curso');
      }
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Academia</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie trilhas de certificação e treinamentos para revendas.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Novo Curso
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm">
          <strong>Erro ao carregar:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-[#9097A5] rounded-xl border" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>Carregando...</div>
      ) : courses.length === 0 ? (
        <div className="p-10 rounded-xl border text-center" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <GraduationCap size={32} className="mx-auto mb-3 text-[#9097A5]" />
          <p className="text-white font-medium">Nenhum curso cadastrado</p>
          <p className="text-sm text-[#9097A5] mt-1">Crie o primeiro curso de treinamento para revendas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map((c, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              key={c.id} 
              className="p-6 rounded-xl border flex flex-col gap-4 relative group"
              style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#161A23] to-[#252A35] border border-[#252A35] flex items-center justify-center">
                <GraduationCap size={24} className="text-[#d4af37]" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{c.title}</h3>
                {c.description && <p className="text-sm text-[#9097A5] mt-1">{c.description}</p>}
                <p className="text-sm text-[#9097A5] mt-1">{c.category || 'Geral'}</p>
              </div>
              <div className="mt-2 pt-4 border-t border-[#252A35] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold ${
                    String(c.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED' ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {String(c.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED' ? 'Publicado' : c.status}
                  </span>
                  <button
                    onClick={() => openModal(c)}
                    className="text-sm text-[#d4af37] flex items-center gap-1 hover:underline"
                  >
                    <BookOpen size={16} /> Editar Currículo
                  </button>
                </div>
                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(c)}
                    className="text-sm text-[#9097A5] hover:text-white transition-colors"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id, c.title)}
                    className="text-sm text-red-400 hover:text-red-300 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#11141C] border border-[#252A35] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-[#252A35]">
                <h3 className="text-lg font-bold text-white">
                  {editingCourse ? 'Editar Curso' : 'Novo Curso'}
                </h3>
                <button onClick={closeModal} className="text-[#9097A5] hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {formError && (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Título</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="Ex.: Onboarding de Revendas"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Descrição (Opcional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors resize-none h-20"
                    placeholder="Breve descrição do curso"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Categoria (Opcional)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                    placeholder="Ex.: Onboarding, Avançado, Técnico"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors"
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="PUBLISHED">Publicado</option>
                    <option value="ARCHIVED">Arquivado</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-[#9097A5]">Currículo (Conteúdo do curso)</label>
                  <textarea
                    value={formData.curriculum}
                    onChange={(e) => setFormData({ ...formData, curriculum: e.target.value })}
                    className="w-full bg-[#161A23] border border-[#252A35] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#d4af37] transition-colors resize-none h-28"
                    placeholder="Inclua o roteiro, módulos e tópicos do curso..."
                  />
                </div>

                <div className="pt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 rounded-lg font-medium text-[#9097A5] hover:text-white transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Curso'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
