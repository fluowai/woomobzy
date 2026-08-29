import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { 
  Command, 
  Network, 
  Package, 
  Key, 
  Server, 
  Camera, 
  Rocket, 
  Wand2, 
  Headset, 
  GraduationCap, 
  DollarSign, 
  ShieldAlert, 
  Search, 
  Settings,
  Bell,
  Menu,
  X,
  ChevronDown,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const WooControlLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const navigate = useNavigate();

  // Command Palette listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const menuItems = [
    { name: 'Overview', icon: <Activity size={18} />, path: '/woo-control' },
    { name: 'Network', icon: <Network size={18} />, path: '/woo-control/network' },
    { name: 'Products', icon: <Package size={18} />, path: '/woo-control/products' },
    { name: 'Licensing', icon: <Key size={18} />, path: '/woo-control/licensing' },
    { name: 'Deployments', icon: <Server size={18} />, path: '/woo-control/deployments' },
    { name: 'Snapshots', icon: <Camera size={18} />, path: '/woo-control/snapshots' },
    { name: 'Releases', icon: <Rocket size={18} />, path: '/woo-control/releases' },
    { name: 'Stack Generator', icon: <Wand2 size={18} />, path: '/woo-control/stack-generator' },
    { name: 'Support', icon: <Headset size={18} />, path: '/woo-control/support' },
    { name: 'Academy', icon: <GraduationCap size={18} />, path: '/woo-control/academy' },
    { name: 'Revenue', icon: <DollarSign size={18} />, path: '/woo-control/revenue' },
    { name: 'Security', icon: <ShieldAlert size={18} />, path: '/woo-control/security' },
    { name: 'Audit', icon: <Command size={18} />, path: '/woo-control/audit' },
    { name: 'Settings', icon: <Settings size={18} />, path: '/woo-control/settings' },
  ];

  return (
    <div className="flex h-screen overflow-hidden text-[#F5F6F8] font-sans" style={{ backgroundColor: '#080A0F' }}>
      
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 250 }}
        animate={{ width: isSidebarOpen ? 250 : 70 }}
        className="flex flex-col flex-shrink-0 transition-all duration-300 border-r"
        style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b" style={{ borderColor: '#252A35' }}>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 font-bold tracking-wider"
              >
                <Command size={20} className="text-[#d4af37]" />
                <span>WOO CONTROL</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded hover:bg-white/5 transition-colors">
            <Menu size={20} className="text-[#9097A5]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-1 custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/woo-control'}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md transition-colors ${
                  isActive 
                    ? 'bg-[#161A23] text-white border border-[#252A35]' 
                    : 'text-[#9097A5] hover:bg-[#161A23]/50 hover:text-white'
                }`
              }
              title={!isSidebarOpen ? item.name : undefined}
            >
              {item.icon}
              <AnimatePresence>
                {isSidebarOpen && (
                  <motion.span 
                    initial={{ opacity: 0, width: 0 }} 
                    animate={{ opacity: 1, width: 'auto' }} 
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap text-sm font-medium"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t" style={{ borderColor: '#252A35' }}>
          <button 
            className="w-full flex items-center justify-center gap-2 py-2 rounded-md bg-[#161A23] hover:bg-[#252A35] transition-colors border border-[#252A35] text-xs text-[#9097A5]"
            onClick={() => setIsCommandPaletteOpen(true)}
          >
            <Search size={14} />
            {isSidebarOpen && <span>Ctrl + K</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b" style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}>
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold tracking-wide">Platform Control Center</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#080A0F] border border-[#252A35] text-xs text-[#9097A5]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Operational
            </div>
            
            <button className="p-2 rounded-full hover:bg-[#161A23] transition-colors relative">
              <Bell size={18} className="text-[#9097A5]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="flex items-center gap-2 pl-4 border-l border-[#252A35] cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#064e3b] to-[#d4af37] flex items-center justify-center text-sm font-bold text-white shadow-lg">
                PO
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-tight">Platform Owner</span>
                <span className="text-xs text-[#9097A5] leading-tight">WooTech</span>
              </div>
              <ChevronDown size={14} className="text-[#9097A5] ml-1" />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 relative">
          <Outlet />
        </main>
      </div>

      {/* Command Palette Overlay */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh]"
              onClick={() => setIsCommandPaletteOpen(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden border"
                style={{ backgroundColor: '#11141C', borderColor: '#252A35' }}
              >
                <div className="flex items-center px-4 py-3 border-b border-[#252A35]">
                  <Search size={20} className="text-[#9097A5] mr-3" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search organizations, domains, licenses..." 
                    className="flex-1 bg-transparent border-none outline-none text-[#F5F6F8] placeholder-[#9097A5] text-lg"
                  />
                  <button onClick={() => setIsCommandPaletteOpen(false)} className="p-1 text-[#9097A5] hover:text-white rounded">
                    <X size={20} />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-[#9097A5] uppercase tracking-wider">
                    Recent Searches
                  </div>
                  <div className="p-2 flex items-center justify-between hover:bg-[#161A23] rounded-lg cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <Network size={16} className="text-[#d4af37]" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium group-hover:text-white">Grupo Alpha</span>
                        <span className="text-xs text-[#9097A5]">Master Reseller</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#9097A5] px-2 py-1 rounded bg-[#252A35]">Open</span>
                  </div>
                  <div className="p-2 flex items-center justify-between hover:bg-[#161A23] rounded-lg cursor-pointer transition-colors group">
                    <div className="flex items-center gap-3">
                      <Key size={16} className="text-emerald-500" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium group-hover:text-white">crm.alpha.com.br</span>
                        <span className="text-xs text-[#9097A5]">Imobzy v4.8.0 • ACTIVE</span>
                      </div>
                    </div>
                    <span className="text-xs text-[#9097A5] px-2 py-1 rounded bg-[#252A35]">License</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};
