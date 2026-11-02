import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  Home, 
  Mic, 
  MapPin, 
  BrainCircuit, 
  BookOpen, 
  Calendar as CalendarIcon, 
  Settings, 
  LogOut, 
  Sparkles, 
  Menu, 
  X,
  ChevronRight,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNav = [
    { to: '/', label: 'Home', icon: Home, exact: true },
    { to: '/topics', label: 'Topics', icon: BookOpen },
    { to: '/explain', label: 'Teach Back', icon: Mic, badge: 'Voice AI' },
    { to: '/palace', label: 'Memory Palace', icon: MapPin },
    { to: '/recall', label: 'Recall Mode', icon: BrainCircuit, badge: 'Active' },
    { to: '/calendar', label: 'Exams & Cal', icon: CalendarIcon },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const bottomNav = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/explain', label: 'Explain', icon: Mic },
    { to: '/palace', label: 'Palace', icon: MapPin },
    { to: '/recall', label: 'Recall', icon: BrainCircuit },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:flex-row antialiased selection:bg-primary/20">
      
      {/* DESKTOP SIDEBAR (lg+) */}
      <aside 
        className={`hidden lg:flex flex-col border-r border-border bg-card/70 backdrop-blur-xl transition-all duration-300 sticky top-0 h-screen z-30 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-primary to-accent-foreground flex items-center justify-center shadow-md shadow-primary/25 ring-1 ring-white/20 transition-transform group-hover:scale-105">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <span className="font-display font-bold text-xl tracking-tight text-foreground block">
                  Pinpoint
                </span>
                <span className="text-[10px] text-primary font-semibold tracking-wider uppercase">
                  Explain · Pin · Own
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {mainNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                    isActive
                      ? 'bg-primary/10 text-primary font-semibold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    {!sidebarCollapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!sidebarCollapsed && item.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <motion.div
                        layoutId="activePill"
                        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3 bg-muted/20">
          {!sidebarCollapsed && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Appearance</span>
              <ThemeToggle />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div 
              onClick={() => navigate('/settings')}
              className="flex items-center gap-3 cursor-pointer overflow-hidden p-1 rounded-xl hover:bg-muted/40 transition-colors flex-1"
            >
              <img 
                src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
                alt={user?.name} 
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20 flex-shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="truncate text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{user?.name || 'Student'}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email || 'alex@pinpoint.study'}</p>
                </div>
              )}
            </div>

            <button
              onClick={logout}
              title="Sign out"
              aria-label="Sign out"
              className="p-2 rounded-xl text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="lg:hidden sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3 flex items-center justify-between pt-safe">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-accent-foreground flex items-center justify-center shadow-sm">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">Pinpoint</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => navigate('/settings')}
            className="p-1 rounded-full ring-2 ring-primary/20"
            aria-label="Profile settings"
          >
            <img 
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"} 
              alt={user?.name} 
              className="w-7 h-7 rounded-full object-cover"
            />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-6 overflow-y-auto">
        <Outlet />
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav 
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-lg border-t border-border px-2 py-1 pb-safe flex items-center justify-around shadow-2xl"
      >
        {bottomNav.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all relative ${
                isActive 
                  ? 'text-primary font-bold' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110 text-primary' : ''}`} />
                {isActive && (
                  <motion.div 
                    layoutId="mobileNavDot"
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" 
                  />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

    </div>
  );
}

