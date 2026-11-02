import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Mic, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { MasteryRing } from '../components/MasteryRing';

export default function TopicDetailPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  // Mock topic detail
  const topic = {
    id: topicId,
    title: 'Action Potential & Voltage-gated Channels',
    unitTitle: 'Cellular Neuroscience',
    mastery: 58,
    summary: 'Explains the cyclical depolarization, repolarization, and refractory periods mediated by voltage-gated Na+ and K+ channels across neuronal membranes.',
    keyPoints: [
      { id: 1, text: 'Resting membrane potential established by Na+/K+ ATPase and leak K+ channels (-70mV)', covered: true },
      { id: 2, text: 'Threshold stimulus (-55mV) triggers rapid opening of voltage-gated Na+ activation gates', covered: true },
      { id: 3, text: 'Depolarization peak (+30mV) causes Na+ channel inactivation and slow K+ activation gate opening', covered: true },
      { id: 4, text: 'K+ efflux repolarizes membrane and causes brief hyperpolarization (afterpotential)', covered: false },
      { id: 5, text: 'Absolute and relative refractory periods ensure unidirectional propagation down axon', covered: false },
      { id: 6, text: 'Myelination and Nodes of Ranvier enable saltatory conduction, increasing speed', covered: true }
    ],
    flags: [
      { id: 1, title: 'Resting potential', placeName: 'Alex\'s Studio Apartment', emoji: '🚪' },
      { id: 2, title: 'Threshold & Na+ influx', placeName: 'Alex\'s Studio Apartment', emoji: '⚡' },
      { id: 3, title: 'Inactivation peak', placeName: 'Campus Library', emoji: '🏔️' },
    ]
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Back button */}
      <button
        onClick={() => navigate('/topics')}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Topics
      </button>

      {/* Hero Header */}
      <div className="p-6 bg-card border border-border rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <MasteryRing value={topic.mastery} size={64} strokeWidth={6} />
          <div>
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
              {topic.unitTitle}
            </span>
            <h1 className="font-display text-2xl font-bold text-foreground mt-0.5">
              {topic.title}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              {topic.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/topics/${topic.id}/explain`)}
            className="px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25 flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105"
          >
            <Mic className="w-4 h-4" />
            <span>Teach It Back Aloud</span>
          </button>
        </div>
      </div>

      {/* Key Points Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Key Points & Gap Coverage
          </h2>
          <span className="text-xs text-muted-foreground">
            {topic.keyPoints.filter(k => k.covered).length} of {topic.keyPoints.length} covered in recent tests
          </span>
        </div>

        <div className="space-y-2.5">
          {topic.keyPoints.map((kp, idx) => (
            <div
              key={kp.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                kp.covered 
                  ? 'bg-card border-border' 
                  : 'bg-warning/5 border-warning/30 shadow-sm'
              }`}
            >
              <div className="mt-0.5">
                {kp.covered ? (
                  <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground leading-relaxed">
                  {kp.text}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                kp.covered ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'
              }`}>
                {kp.covered ? 'Covered' : 'Missing Gap'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Memory Palace Flags Attached to this Topic */}
      <div className="space-y-3 pt-4 border-t border-border">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Attached Palace Flags ({topic.flags.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {topic.flags.map((flag) => (
            <div
              key={flag.id}
              onClick={() => navigate('/palace/1')}
              className="p-3.5 bg-card border border-border rounded-2xl hover:border-primary/50 transition-all cursor-pointer flex items-center gap-3 shadow-sm"
            >
              <span className="text-xl">{flag.emoji}</span>
              <div className="truncate">
                <p className="text-xs font-bold text-foreground truncate">{flag.title}</p>
                <p className="text-[11px] text-muted-foreground truncate">{flag.placeName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

