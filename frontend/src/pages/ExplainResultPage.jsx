import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  HelpCircle, 
  XCircle, 
  AlertTriangle, 
  RotateCcw, 
  MapPin, 
  ArrowLeft,
  Sparkles,
  Award
} from 'lucide-react';
import { MasteryRing } from '../components/MasteryRing';
import confetti from 'canvas-confetti';

export default function ExplainResultPage() {
  const { topicId, explanationId } = useParams();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Subtle celebratory confetti if score is high
    try {
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    } catch (e) {}
  }, []);

  // Mock Result matching README API specification
  const result = {
    score: 63,
    summary: "Solid start on the electrical concepts. You correctly hit resting potential and threshold trigger, but missed the refractory mechanism and misattributed the after-potential ions.",
    points: [
      { id: 1, title: "Resting membrane potential (-70mV)", status: "covered", feedback: "Accurately noted Na+/K+ ATPase and leak channels." },
      { id: 2, title: "Threshold & Na+ activation gates", status: "covered", feedback: "Good explanation of voltage-gated activation." },
      { id: 3, title: "Peak depolarization (+30mV) & inactivation", status: "partial", feedback: "Mentioned Na+ shut-off, but missed the slow K+ opening delay." },
      { id: 4, title: "K+ efflux repolarization & after-potential", status: "incorrect", feedback: "You stated chloride influx repolarizes; it is K+ efflux through voltage-gated channels." },
      { id: 5, title: "Absolute & relative refractory periods", status: "missing", feedback: "Completely skipped unidirectional propagation and channel reset timing." },
      { id: 6, title: "Saltatory conduction at Nodes of Ranvier", status: "covered", feedback: "Clear description of myelin insulation." }
    ],
    next_focus: [3, 4, 5]
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'covered':
        return {
          icon: CheckCircle2,
          color: 'text-success bg-success/10 border-success/30',
          label: 'Covered'
        };
      case 'partial':
        return {
          icon: HelpCircle,
          color: 'text-warning bg-warning/10 border-warning/30',
          label: 'Partial'
        };
      case 'incorrect':
        return {
          icon: XCircle,
          color: 'text-danger bg-danger/10 border-danger/30',
          label: 'Incorrect'
        };
      case 'missing':
      default:
        return {
          icon: AlertTriangle,
          color: 'text-danger bg-danger/10 border-danger/30',
          label: 'Missing Gap'
        };
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/topics')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Topics
      </button>

      {/* Header & Score Hero Card */}
      <div className="p-6 sm:p-8 bg-card border border-border rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <MasteryRing value={result.score} size={84} strokeWidth={8} />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                AI Gap Map Result
              </span>
              <span className="text-xs text-muted-foreground">Target: 70% Pass</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              {result.score >= 70 ? 'Topic Mastered! 🎉' : 'Keep Going! Gaps Identified'}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-lg leading-relaxed">
              {result.summary}
            </p>
          </div>
        </div>

        {/* Action CTAs: Retry vs Pin Gaps */}
        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 w-full md:w-auto">
          <button
            onClick={() => navigate('/palace/1')}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all hover:scale-105"
          >
            <MapPin className="w-4 h-4" />
            <span>Pin the Gaps to Palace</span>
          </button>
          <button
            onClick={() => navigate(`/topics/${topicId || 11}/explain`)}
            className="px-4 py-2.5 rounded-2xl border border-border bg-card text-foreground font-semibold text-xs hover:bg-muted flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4 text-muted-foreground" />
            <span>Retry Gaps (Teach Back)</span>
          </button>
        </div>
      </div>

      {/* Gap Map Key Points Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Key Points Breakdown ({result.points.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Points scored using PERN weighted rubric
          </span>
        </div>

        <div className="space-y-3">
          {result.points.map((pt) => {
            const statusConfig = getStatusBadge(pt.status);
            const Icon = statusConfig.icon;

            return (
              <div
                key={pt.id}
                className="p-4 sm:p-5 bg-card border border-border rounded-2xl shadow-sm space-y-2 hover:border-border/80 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {pt.id}
                    </span>
                    <h3 className="text-xs sm:text-sm font-bold text-foreground">
                      {pt.title}
                    </h3>
                  </div>

                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border flex-shrink-0 ${statusConfig.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>

                {/* AI Detailed Feedback */}
                <div className="pl-8.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">AI Feedback:</strong> {pt.feedback}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

