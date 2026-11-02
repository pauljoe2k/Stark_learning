import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { 
  User, 
  Moon, 
  Sun, 
  Monitor, 
  LogOut, 
  Shield, 
  Bell, 
  Sparkles,
  Check
} from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name || 'Alex Stark');
  const [email, setEmail] = useState(user?.email || 'alex@pinpoint.study');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account profile, theme appearance, and learning preferences.
        </p>
      </div>

      {/* Profile Form */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Student Profile
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex items-center gap-4">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150"}
              alt="Avatar"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-primary/20"
            />
            <div>
              <p className="text-sm font-bold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">Free Tier Student Plan</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-foreground block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 flex items-center gap-1.5"
          >
            {saved ? <Check className="w-4 h-4" /> : null}
            <span>{saved ? 'Changes Saved' : 'Save Changes'}</span>
          </button>
        </form>
      </div>

      {/* Theme Appearance Selector */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            Interface Theme
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select light, dark, or sync automatically with your system preferences.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((item) => {
            const Icon = item.icon;
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sign Out Card */}
      <div className="bg-card border border-border rounded-3xl p-6 flex items-center justify-between shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-foreground">Sign Out</h3>
          <p className="text-xs text-muted-foreground">Clear current session on this device</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger font-semibold text-xs flex items-center gap-2 transition-colors border border-danger/20"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>

    </div>
  );
}

