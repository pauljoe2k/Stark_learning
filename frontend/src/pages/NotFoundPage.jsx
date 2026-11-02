import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6">
      <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mb-4">
        <Compass className="w-8 h-8 animate-pulse" />
      </div>
      <h1 className="font-display text-4xl font-bold text-foreground">404</h1>
      <p className="text-lg font-semibold text-foreground mt-2">Palace room not found</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        The page you are looking for has been moved or doesn't exist in your memory map.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md"
      >
        <Home className="w-4 h-4" />
        Return Home
      </Link>
    </div>
  );
}

