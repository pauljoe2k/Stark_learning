import { NavLink } from 'react-router-dom';
import { BookOpen, Brain, House, Map, Mic2 } from 'lucide-react';

const links = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/topic', label: 'Topic', icon: BookOpen },
  { to: '/explain', label: 'Explain', icon: Mic2 },
  { to: '/palace', label: 'Palace', icon: Map },
  { to: '/recall', label: 'Recall', icon: Brain },
];

export default function BottomBar() {
  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-lg backdrop-blur md:sticky md:top-0 md:order-first md:border-b md:border-t-0 md:px-8 md:py-2">
      <div className="mx-auto flex max-w-5xl items-center justify-around md:justify-center md:gap-8">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-link flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-semibold transition md:min-w-24 md:flex-row md:gap-2 md:text-sm ${
              isActive ? 'active-nav-link text-moss' : 'text-slate-600'
            }`}
          >
            {({ isActive }) => <>
              <Icon aria-hidden="true" size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{label}</span>
            </>}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}