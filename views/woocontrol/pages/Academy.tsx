import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen } from 'lucide-react';
import { fetchWooAcademy } from '../../../services/wooControl';

export const Academy = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchWooAcademy()
      .then((c) => {
        if (active) {
          setCourses(c);
          setError(null);
        }
      })
      .catch((e: any) => {
        if (active) setError(e.message || 'Falha ao carregar cursos');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Academia</h2>
          <p className="text-sm text-[#9097A5] mt-1">Gerencie trilhas de certificação e treinamentos para revendas.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors">
          Novo Curso
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
              className="p-6 rounded-xl border flex flex-col gap-4"
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
              <div className="mt-2 pt-4 border-t border-[#252A35]">
                <span className={`text-xs font-semibold ${
                  String(c.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED' ? 'text-emerald-500' : 'text-amber-500'
                }`}>
                  {String(c.status || 'PUBLISHED').toUpperCase() === 'PUBLISHED' ? 'Publicado' : c.status}
                </span>
                <button className="text-sm text-[#d4af37] flex items-center gap-2 hover:underline mt-2">
                  <BookOpen size={16} /> Editar Currículo
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
