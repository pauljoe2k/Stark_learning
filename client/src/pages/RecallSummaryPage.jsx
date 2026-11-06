import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  Trophy, 
  RotateCcw, 
  MapPin, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRight,
  Flame,
  Sparkles
} from 'lucide-react';
import { MasteryRing } from '../components/MasteryRing';
import confetti from 'canvas-confetti';

export default function RecallSummaryPage() {
  const { roundId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const results = location.state?.results || [
    {
      flagId: 101,
      recalled: true,
      timeTaken: 6,
      flag: { title: "Front Door: Resting Potential (-70mV)", emoji: "🚪", x: 28, y: 42 }
    },
    {
      flagId: 102,
      recalled: true,
      timeTaken: 9,
      flag: { title: "Kitchen Counter: Rapid Na+ Influx", emoji: "⚡", x: 64, y: 35 }
    },
    {
      flagId: 103,
      recalled: false,
      timeTaken: 15,
      flag: { title: "Living Room Rug: Saltatory Conduction", emoji: "🏃", x: 80, y: 68 }
    }
  ];

  const total = results.length;
  const correct = results.filter((r) => r.recalled).length;
  const scorePercent = Math.round((correct / total) * 100);

  React.useEffect(() => {
    if (scorePercent >= 65) {
      try {
        confetti({ particleCount: 40, spread: 70, origin: { y: 0.6 } });
      } catch (e) {}
    }
  }, [scorePercent]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header Result Card */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <MasteryRing value={scorePercent} size={84} strokeWidth={8} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Round Complete
              </span>
              <span className="text-xs text-muted-foreground">{correct} of {total} pins recalled</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {scorePercent >= 80 ? 'Exceptional Memory Recall!' : 'Good Effort! Reinforce Weak Pins'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Regular spatial recall moves concepts from short-term memory into lasting crystalline palaces.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto">
          <button
            onClick={() => navigate('/recall')}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25 flex items-center justify-center gap-2 hover:bg-primary/90"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Retry Weak Pins</span>
          </button>
          <button
            onClick={() => navigate('/palace/1')}
            className="px-4 py-2.5 rounded-2xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>Open Palace View</span>
          </button>
        </div>
      </div>

      {/* Heatmap Overlay on Photo */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Palace Recall Heatmap
        </h3>
        <div className="relative rounded-3xl overflow-hidden border border-border bg-muted max-h-72">
          <img
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200"
            alt="Palace Room"
            className="w-full h-full object-cover filter brightness-[0.7]"
          />

          {/* Render Pins with Green/Red Heatmap styling */}
          {results.map((res, i) => (
            <div
              key={i}
              style={{ left: `${res.flag.x}%`, top: `${res.flag.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full shadow-2xl flex items-center gap-1.5 border-2 ${
                res.recalled
                  ? 'bg-emerald-500/90 border-emerald-300 text-white'
                  : 'bg-rose-500/90 border-rose-300 text-white animate-pulse'
              }`}
            >
              <span className="text-sm">{res.flag.emoji}</span>
              <span className="text-[10px] font-bold">
                {res.recalled ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">
          Detailed Pin Timing & Recall Status
        </h3>

        <div className="space-y-2.5">
          {results.map((res, i) => (
            <div
              key={i}
              className="p-4 bg-card border border-border rounded-2xl flex items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{res.flag.emoji}</span>
                <div>
                  <h4 className="text-xs font-bold text-foreground">{res.flag.title}</h4>
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    Recalled in {res.timeTaken} seconds
                  </span>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                res.recalled ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
              }`}>
                {res.recalled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                <span>{res.recalled ? 'Recalled' : 'Missed'}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

