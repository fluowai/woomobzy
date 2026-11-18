import React, { useState, useMemo } from 'react';
import { Outlet, useNavigate, NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  HelpCircle,
  Users,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  LucideIcon,
  DollarSign,
  Globe,
  Plug,
  ToggleRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import WooTechLogo from '../../components/WooTechLogo';
import WorkspaceTopBar from '../../components/WorkspaceTopBar';
import ImpersonationBanner from '../../components/ImpersonationBanner';
import { getNavigationForProfile, NavigationItem } from '@/src/lib/navigationConfig';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Building2,
  CreditCard,
  HelpCircle,
  Users,
  Settings,
  DollarSign,
  Globe,
  Plug,
  ToggleRight,
};

export const SuperAdminLayout: React.FC = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const navItems = useMemo(
    () => getNavigationForProfile(profile?.role, 'superadmin'),
    [profile?.role]
  );

  const toggleGroup = (id: string, currentState: boolean) => {
    setOpenGroups((prev) => ({ ...prev, [id]: !currentState }));
  };

  const isItemActive = (item: NavigationItem) => {
    if (item.exact) return pathname === item.path;
    if (item.children && item.children.length > 0) {
      return (
        pathname === item.path ||
        item.children.some(
          (child) => pathname === child.path || pathname.startsWith(`${child.path}/`)
        )
      );
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-[#FFFFFF] border-r border-[#E5E7EB] text-[#182230] select-none">
      <div className="flex h-16 items-center px-5 border-b border-[#E5E7EB]">
        <Link to="/superadmin" className="flex items-center gap-2 transition hover:opacity-90">
          <WooTechLogo variant="light" subtitle="crm" size="sm" />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = iconMap[item.iconName] || LayoutDashboard;
          const hasChildren = item.children && item.children.length > 0;
          const active = isItemActive(item);
          const isOpen = openGroups[item.id] !== undefined ? openGroups[item.id] : active;

          if (!hasChildren) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className={`relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-orange-50/70 text-[#FF6A00]'
                    : 'text-[#526071] hover:bg-gray-50 hover:text-[#182230]'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#FF6A00]" />
                )}
                <Icon size={18} className={active ? 'text-[#FF6A00]' : 'text-[#526071]'} />
                <span>{item.label}</span>
              </NavLink>
            );
          }

          return (
            <div key={item.id} className="space-y-0.5">
              <div
                onClick={() => toggleGroup(item.id, isOpen)}
                className={`relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold cursor-pointer transition-all ${
                  active
                    ? 'bg-orange-50/70 text-[#FF6A00]'
                    : 'text-[#526071] hover:bg-gray-50 hover:text-[#182230]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#FF6A00]" />
                  )}
                  <Icon size={18} className={active ? 'text-[#FF6A00]' : 'text-[#526071]'} />
                  <span>{item.label}</span>
                </div>
                {isOpen ? (
                  <ChevronDown size={15} className="text-[#526071]" />
                ) : (
                  <ChevronRight size={15} className="text-[#526071]" />
                )}
              </div>

              {isOpen && (
                <div className="pl-9 pr-2 py-1 space-y-0.5">
                  {item.children?.map((child) => {
                    const isChildActive = child.exact
                      ? pathname === child.path
                      : pathname === child.path || pathname.startsWith(`${child.path}/`);

                    return (
                      <NavLink
                        key={child.id}
                        to={child.path}
                        className={`block rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                          isChildActive
                            ? 'font-bold text-[#FF6A00] bg-orange-50/50'
                            : 'text-[#526071] hover:text-[#182230] hover:bg-gray-50'
                        }`}
                      >
                        {child.label}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-[#F8FAFC] font-sans antialiased text-[#182230]">
      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-60 flex-col shrink-0">
          {renderSidebarContent()}
        </aside>

        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-50 md:hidden bg-black/40"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-64 bg-white shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end p-2 border-b border-[#E5E7EB]">
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 text-[#526071]"
                >
                  <X size={20} />
                </button>
              </div>
              {renderSidebarContent()}
            </div>
          </div>
        )}

        <div className="flex flex-1 flex-col overflow-hidden">
          <WorkspaceTopBar />
          <main className="flex-1 overflow-y-auto bg-[#F8FAFC]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
