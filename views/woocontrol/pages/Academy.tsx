import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen } from 'lucide-react';

const mockCourses = [
  { id: 1, title: 'Mastering the Reseller Panel', modules: 5, students: 120 },
  { id: 2, title: 'Self-Hosted Deployment Guide', modules: 3, students: 45 },
];

export const Academy = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Academy</h2>
          <p className="text-sm text-[#9097A5] mt-1">Manage certification tracks and training for resellers.</p>
        </div>
        <button className="px-4 py-2 rounded-lg font-medium bg-[#d4af37] text-black hover:bg-[#b5952f] transition-colors">
          New Course
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockCourses.map((c, i) => (
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
              <p className="text-sm text-[#9097A5] mt-1">{c.modules} Modules • {c.students} Active Students</p>
            </div>
            <div className="mt-2 pt-4 border-t border-[#252A35]">
              <button className="text-sm text-[#d4af37] flex items-center gap-2 hover:underline">
                <BookOpen size={16} /> Edit Curriculum
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
