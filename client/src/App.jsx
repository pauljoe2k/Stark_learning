import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useSession, SessionProvider } from './lib/SessionContext.jsx';
import BottomBar from './components/BottomBar.jsx';
import Home from './pages/Home.jsx';
import Topic from './pages/Topic.jsx';
import Explain from './pages/Explain.jsx';
import Palace from './pages/Palace.jsx';
import PlaceView from './pages/PlaceView.jsx';
import Recall from './pages/Recall.jsx';
import Login from './pages/Login.jsx';
import { LogOut } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SessionProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </SessionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function AuthenticatedApp() {
  const { user, ready, logout } = useSession();
  if (!ready) return <main className="p-8 text-center text-slate-600">Loading Pinpoint...</main>;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between bg-ink px-4 py-3 text-white sm:px-8">
        <Link to="/" className="text-lg font-bold tracking-tight">Pinpoint</Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline">{user.name}</span>
          <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10">
            <LogOut aria-hidden="true" size={17} /> Sign out
          </button>
        </div>
      </header>
      <BottomBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/topic" element={<Topic />} />
        <Route path="/explain" element={<Explain />} />
        <Route path="/palace" element={<Palace />} />
        <Route path="/palace/:id" element={<PlaceView />} />
        <Route path="/recall" element={<Recall />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
