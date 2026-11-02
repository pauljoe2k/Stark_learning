import React from 'react';
import { Outlet, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';

export function AuthLayout() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex h-14 w-14 rounded-3xl bg-gradient-to-tr from-primary to-accent-foreground items-center justify-center shadow-xl shadow-primary/25 mb-4">
          <MapPin className="w-8 h-8 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Pinpoint
        </h1>
        <p className="mt-1 text-sm text-muted-foreground font-medium">
          Explain it. Pin it. Own it.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-card py-8 px-6 sm:px-10 shadow-xl border border-border rounded-3xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

