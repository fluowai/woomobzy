import React, { useState, useEffect } from 'react';
import { Heart, Menu, X } from 'lucide-react';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <a href="#" className="flex items-center">
              <img
                src={
                  scrolled
                    ? 'https://megainvestimoveis.com.br/assets/layout/megainvestimentos/logo.png?v=fc2eb21d'
                    : 'https://megainvestimoveis.com.br/assets/layout/megainvestimentos/logo_branca.png?v=11a4075f'
                }
                alt="Mega Investimentos Imobiliários"
                className="h-12 md:h-16 w-auto object-contain transition-all duration-300"
              />
            </a>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-8">
              <a
                href="#"
                className={`flex items-center gap-2 font-medium transition-colors hover:text-[#226aa6] ${
                  scrolled ? 'text-[#00325c]' : 'text-white'
                }`}
              >
                Meus Favoritos <Heart size={18} />
              </a>
              <a
                href="#"
                className={`font-medium transition-colors hover:text-[#226aa6] ${
                  scrolled ? 'text-[#00325c]' : 'text-white'
                }`}
              >
                Comprar
              </a>
              <a
                href="#"
                className={`font-medium transition-colors hover:text-[#226aa6] ${
                  scrolled ? 'text-[#00325c]' : 'text-white'
                }`}
              >
                Lançamentos
              </a>
              <a
                href="#"
                className={`font-medium transition-colors hover:text-[#226aa6] ${
                  scrolled ? 'text-[#00325c]' : 'text-white'
                }`}
              >
                Quem Somos
              </a>
            </nav>

            {/* Mobile Toggle */}
            <button
              className="lg:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X size={28} className={scrolled ? 'text-[#00325c]' : 'text-white'} />
              ) : (
                <Menu size={28} className={scrolled ? 'text-[#00325c]' : 'text-white'} />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`fixed inset-0 bg-white z-40 transition-transform duration-300 pt-24 px-6 ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <nav className="flex flex-col gap-6 text-xl font-medium text-[#00325c]">
          <a href="#" className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <Heart size={24} /> Meus Favoritos
          </a>
          <a href="#" className="border-b border-gray-100 pb-4">Comprar</a>
          <a href="#" className="border-b border-gray-100 pb-4">Lançamentos</a>
          <a href="#" className="border-b border-gray-100 pb-4">Quem Somos</a>
        </nav>
      </div>
    </>
  );
}
