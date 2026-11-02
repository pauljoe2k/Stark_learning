import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  Plus, 
  BrainCircuit, 
  Sparkles, 
  ArrowRight,
  Layers,
  Clock
} from 'lucide-react';
import { initialDashboardData } from '../mockData';

export default function PalaceGridPage() {
  const navigate = useNavigate();
  const [palaces, setPalaces] = useState(initialDashboardData.palaces);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Memory Palaces
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Familiar places holding your spatial active recall flags
          </p>
        </div>

        <button
          onClick={() => navigate('/palace/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Place</span>
        </button>
      </div>

      {/* Grid of Places */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {palaces.map((place) => (
          <div
            key={place.id}
            onClick={() => navigate(`/palace/${place.id}`)}
            className="group bg-card border border-border rounded-3xl overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-sm flex flex-col"
          >
            <div className="relative h-48 overflow-hidden bg-muted">
              <img
                src={place.thumbnail}
                alt={place.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-md text-[11px] font-bold text-foreground border border-border flex items-center gap-1.5 shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>{place.flagsCount} flags</span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                  {place.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Last tested: {place.lastTrained}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  Explore Palace <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/recall');
                  }}
                  className="px-3 py-1 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Recall Mode
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

