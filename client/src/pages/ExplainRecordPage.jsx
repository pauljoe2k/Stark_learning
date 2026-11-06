import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Mic, 
  MicOff, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Volume2, 
  AlertCircle,
  FileEdit,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpeech } from '../hooks/useSpeech';

export default function ExplainRecordPage() {
  const { topicId } = useParams();
  const navigate = useNavigate();

  // Step 1 or Step 2
  const [stage, setStage] = useState('setup'); // 'setup' | 'recording'
  const [selectedDuration, setSelectedDuration] = useState(120); // 120s = 2 min default
  const [timeLeft, setTimeLeft] = useState(120);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice speech hook
  const { isListening, transcript, setTranscript, isSupported, startListening, stopListening } = useSpeech();

  // Mock topics options
  const topicTitle = topicId === '11' 
    ? 'Action Potential & Voltage-gated Channels' 
    : 'Photosynthesis & Light-Dependent Reactions';

  const timeChips = [
    { label: '1 min', sec: 60 },
    { label: '2 min', sec: 120 },
    { label: '3 min', sec: 180 },
    { label: '5 min', sec: 300 },
  ];

  const handleStartRecord = () => {
    setTimeLeft(selectedDuration);
    setStage('recording');
    startListening();
  };

  // Countdown runs off `stage` alone. Pausing the mic, switching tabs, or a browser
  // without SpeechRecognition must not freeze the clock (PRD FR-4.1).
  useEffect(() => {
    if (stage !== 'recording') return;
    if (timeLeft <= 0) {
      stopListening();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, timeLeft, stopListening]);

  const handleSubmitExplanation = () => {
    setIsSubmitting(true);
    // In real app, posts to /topics/:id/explain
    setTimeout(() => {
      setIsSubmitting(false);
      navigate(`/topics/${topicId || 11}/explain/exp-1`);
    }, 1500);
  };

  const circumference = 2 * Math.PI * 45;
  const timerDashoffset = circumference - ((selectedDuration - timeLeft) / selectedDuration) * circumference;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Teach It Back \u00B7 Active Recall Loop</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
          {stage === 'setup' ? 'Setup Your Explanation' : 'Explain Aloud to Gemini'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Topic: <span className="text-foreground font-semibold">{topicTitle}</span>
        </p>
      </div>

      {stage === 'setup' ? (
        /* STEP 1: TIME CHIPS SETUP */
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="space-y-3">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              1. Choose Target Speaking Time
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {timeChips.map((chip) => (
                <button
                  key={chip.sec}
                  type="button"
                  onClick={() => setSelectedDuration(chip.sec)}
                  className={`py-3.5 px-4 rounded-2xl border text-sm font-bold flex flex-col items-center justify-center transition-all ${
                    selectedDuration === chip.sec
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <Clock className="w-4 h-4 mb-1" />
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Web speech support warning/notice */}
          {!isSupported && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <span className="font-bold block">Browser Speech Notice:</span>
                Live speech is optimized on Chrome and Edge. You can also type or edit your transcript directly before AI scoring.
              </div>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground space-y-1.5">
            <span className="font-bold text-foreground block">How "Teach It Back" Works:</span>
            <p>1. Explain the concepts out loud as if teaching a classmate.</p>
            <p>2. Gemini will generate a live Gap Map marking points as <em>Covered</em>, <em>Partial</em>, <em>Incorrect</em>, or <em>Missing</em>.</p>
            <p>3. Directly send unresolved gaps to your Memory Palace with 1 click.</p>
          </div>

          <button
            onClick={handleStartRecord}
            className="w-full py-3.5 px-6 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-md shadow-primary/25 hover:bg-primary/90 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <Mic className="w-5 h-5" />
            <span>Start Voice Recording</span>
          </button>
        </div>
      ) : (
        /* STEP 2: RECORDING SCREEN */
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm relative overflow-hidden">
            
            {/* Big Mic & Pulse Animation */}
            <div className="flex flex-col items-center justify-center relative">
              
              {/* Outer pulsing ring */}
              {isListening && (
                <motion.div
                  className="absolute w-36 h-36 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
              )}

              {/* Countdown circle SVG */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-28 h-28 transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r="45"
                    className="stroke-muted"
                    strokeWidth="6"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="45"
                    className="stroke-primary transition-all duration-300"
                    strokeWidth="6"
                    strokeDasharray={circumference}
                    strokeDashoffset={timerDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`absolute w-20 h-20 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 ${
                    isListening ? 'bg-danger animate-pulse' : 'bg-primary'
                  }`}
                  aria-label={isListening ? "Stop voice recording" : "Resume voice recording"}
                >
                  {isListening ? <Mic className="w-8 h-8" /> : <MicOff className="w-8 h-8" />}
                </button>
              </div>

              {/* Time remaining */}
              <div className="mt-4">
                <span className="text-3xl font-extrabold font-mono text-foreground tracking-tight">
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  {isListening ? 'Listening to your explanation...' : 'Recording paused / finished'}
                </span>
              </div>
            </div>

            {/* Live Transcript / Typed Fallback with In-place Edit */}
            <div className="text-left space-y-2 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileEdit className="w-4 h-4 text-primary" />
                  Live Transcript (Editable)
                </label>
                <span className="text-[11px] text-muted-foreground">
                  You can edit before submitting to AI
                </span>
              </div>

              <textarea
                rows={4}
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Speak aloud or type your explanation here... (e.g. 'Photosynthesis starts in the thylakoid membrane where photon absorption excites chlorophyll P680...')"
                className="w-full bg-background border border-border rounded-2xl p-4 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  stopListening();
                  setTranscript('');
                  setTimeLeft(selectedDuration);
                  setStage('setup');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Reset / Change Time
              </button>

              <button
                type="button"
                onClick={handleSubmitExplanation}
                disabled={isSubmitting || (!transcript.trim())}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gemini Analyzing Gaps...</span>
                  </>
                ) : (
                  <>
                    <span>Submit for AI Gap Map</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
