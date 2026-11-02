import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BrainCircuit, 
  Clock, 
  MapPin, 
  Sparkles, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { initialDashboardData } from '../mockData';

export default function RecallSetupPage() {
  const navigate = useNavigate();
  const [timePerFlag, setTimePerFlag] = useState(15); // seconds per flag
  const [selectedPlaceId, setSelectedPlaceId] = useState('1');

  const timeOptions = [
    { sec: 10, label: '10s (Speed Blitz)' },
    { sec: 15, label: '15s (Standard)' },
    { sec: 30, label: '30s (Deliberate)' },
    { sec: 45, label: '45s (Deep Focus)' },
  ];

  const handleStartRound = () => {
    navigate(`/recall/round-1?time=${timePerFlag}&place=${selectedPlaceId}`);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      <div>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Test Spatial Recall</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          Recall Mode Setup
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test whether your memory pins hold under pressure. Flags will be hidden until you reveal them!
        </p>
      </div>

      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
        
        {/* Select Palace Space */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            1. Select Palace Destination
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {initialDashboardData.palaces.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlaceId(p.id.toString())}
                className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between h-24 ${
                  selectedPlaceId === p.id.toString()
                    ? 'border-primary bg-primary/10 ring-1 ring-primary'
                    : 'border-border bg-background hover:border-primary/40'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold text-foreground truncate">{p.name}</h4>
                  <p className="text-[10px] text-muted-foreground">{p.flagsCount} flags to test</p>
                </div>
                <span className="text-[10px] font-semibold text-primary">Ready</span>
              </button>
            ))}
          </div>
        </div>

        {/* Time Limit per Flag */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            2. Choose Time Limit Per Pin
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {timeOptions.map((opt) => (
              <button
                key={opt.sec}
                type="button"
                onClick={() => setTimePerFlag(opt.sec)}
                className={`py-3 px-3 rounded-2xl border text-center transition-all ${
                  timePerFlag === opt.sec
                    ? 'border-primary bg-primary/10 text-primary font-bold shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                }`}
              >
                <Clock className="w-4 h-4 mx-auto mb-1" />
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Explain rules */}
        <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1.5">
          <span className="font-bold text-foreground block">Recall Rules:</span>
          <p>• Pinned flags are hidden across the photo.</p>
          <p>• Walk the room mentally: recall what concept is anchored at each spot before the timer runs out.</p>
          <p>• Tap <strong>Reveal</strong> to self-grade: <span className="text-success font-semibold">Green (Recalled)</span> or <span className="text-danger font-semibold">Red (Missed)</span>.</p>
        </div>

        <button
          onClick={handleStartRound}
          className="w-full py-3.5 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <BrainCircuit className="w-5 h-5" />
          <span>Start Recall Round</span>
        </button>

      </div>

    </div>
  );
}

