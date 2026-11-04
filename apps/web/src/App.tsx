import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookOpen, Home, MapPin, Mic2, RotateCcw, Signal, SignalZero, LogOut } from 'lucide-react';
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { SocketProvider, useSocket } from './socket';
import { LoginPage } from './pages/LoginPage';
import { TopicPage } from './pages/TopicPage';

const tabs = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/topic', label: 'Topic', icon: BookOpen },
  { to: '/explain', label: 'Explain', icon: Mic2 },
  { to: '/palace', label: 'Palace', icon: MapPin },
  { to: '/recall', label: 'Recall', icon: RotateCcw },
];

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
      </SocketProvider>
    </AuthProvider>
  );
}

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  if (location.pathname === '/login') return user ? <Navigate to="/" replace /> : <LoginPage />;
  if (loading) {
    return <main className="shell-loading" aria-label="Loading Pinpoint"><div className="skeleton-block" /></main>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand"><span className="brand-pin" aria-hidden="true" />Pinpoint</Link>
        <span className="welcome">Hey {user.name}</span>
        <ConnectionBadge />
        <LogoutButton />
      </header>
      <main className="main-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="page-transition"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            {...(reduceMotion ? {} : { exit: { opacity: 0, y: -4 } })}
            transition={{ duration: 0.24 }}
          >
            <Routes location={location}>
              <Route path="/" element={<ShellPage title="Home" description="Your learning journey starts here." />} />
              <Route path="/topic" element={<TopicPage />} />
              <Route path="/explain" element={<ShellPage title="Explain" description="Teach a topic back and find the gaps." />} />
              <Route path="/palace" element={<ShellPage title="Palace" description="Pin key ideas to familiar places." />} />
              <Route path="/recall" element={<ShellPage title="Recall" description="Practice remembering what you pinned." />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
      <nav className="bottom-tabs" aria-label="Main navigation">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `tab-link${isActive ? ' active' : ''}`}>
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function ConnectionBadge() {
  const { status } = useSocket();
  const Icon = status === 'connected' ? Signal : SignalZero;
  return (
    <span className={`connection-status ${status}`} role="status" aria-label={`Live connection ${status}`}>
      <Icon size={16} aria-hidden="true" />
      <span>{status === 'connected' ? 'Live' : status === 'connecting' ? 'Connecting' : 'Offline'}</span>
    </span>
  );
}

function LogoutButton() {
  const { logout } = useAuth();
  return <button className="icon-button logout-button" type="button" onClick={logout} aria-label="Sign out"><LogOut size={18} /></button>;
}

function ShellPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="welcome-panel">
      <span className="eyebrow">PINPOINT / {title.toUpperCase()}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="phase-note">This area is ready for its feature phase.</div>
    </section>
  );
}
