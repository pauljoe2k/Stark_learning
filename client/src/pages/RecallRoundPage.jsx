import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Check, 
  X, 
  Eye, 
  Clock, 
  RotateCcw, 
  ArrowRight,
  BrainCircuit,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RecallRoundPage() {
  const { roundId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Flags to recall
  const [flags] = useState([
    {
      id: 101,
      x: 28,
      y: 42,
      title: "Front Door: Resting Potential (-70mV)",
      keyPoint: "Na+/K+ ATPase and leak channels establish -70mV resting charge.",
      note: "3 Na+ out, 2 K+ in",
      emoji: "\uD83D\uDEAA"
    },
    {
      id: 102,
      x: 64,
      y: 35,
      title: "Kitchen Counter: Rapid Na+ Influx",
      keyPoint: "Threshold stimulus (-55mV) opens voltage-gated Na+ channels.",
      note: "Sparks on the kitchen marble",
      emoji: "\u26A1"
    },
    {
      id: 103,
      x: 80,
      y: 68,
      title: "Living Room Rug: Saltatory Conduction",
      keyPoint: "Impulses jump between Nodes of Ranvier along myelinated axon.",
      note: "Leaping over rug circles",
      emoji: "\uD83C\uDFC3"
    }
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [results, setResults] = useState([]); // { flagId, recalled: boolean, timeTaken: number }
  // Honour the time the student picked on Recall Setup (?time=10|15|30|45).
  const timeLimit = Number(searchParams.get('time')) || 15;
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const currentFlag = flags[currentIndex];

  useEffect(() => {
    let timer;
    if (!isRevealed && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRevealed, timeLeft]);

  const handleReveal = () => {
    setIsRevealed(true);
  };

  const handleGrade = (recalled) => {
    const timeTaken = timeLimit - timeLeft;
    const newResults = [...results, { flagId: currentFlag.id, recalled, timeTaken, flag: currentFlag }];
    setResults(newResults);

    if (currentIndex + 1 < flags.length) {
      setCurrentIndex((prev) => prev + 1);
      setIsRevealed(false);
      setTimeLeft(timeLimit);
    } else {
      // Finished all flags! Navigate to summary
      navigate(`/recall/${roundId}/summary`, { state: { results: newResults } });
    }
  };

  // A timeout counts as not recalled (PRD FR-6.4): grade red the moment the clock
  // hits zero instead of leaving the pin sitting there forever.
  useEffect(() => {
    if (!isRevealed && timeLeft === 0) {
      handleGrade(false);
    }
  }, [timeLeft, isRevealed]); // eslint-disable-line react-hooks/exhaustive-deps

  const circumference = 2 * Math.PI * 32;
  const strokeOffset = circumference - ((timeLimit - timeLeft) / timeLimit) * circumference;

  return (
    <div className="relative min-h-[calc(100vh-4rem)] lg:min-h-screen flex flex-col justify-between bg-[#080c14] text-white p-4 sm:p-6 overflow-hidden">
      
      {/* Top Bar Progress */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between z-10 py-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Pin {currentIndex + 1} of {flags.length}
          </span>
        </div>

        {/* Progress pills */}
        <div className="flex gap-1.5">
          {flags.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-8 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-indigo-500 ring-2 ring-indigo-400/40'
                  : i < currentIndex
                  ? 'bg-emerald-500'
                  : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Center Palace Photo with Spotlight on Current Flag */}
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col items-center justify-center my-4 relative">
        <div className="relative w-full max-h-[50vh] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
          <img
            src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=1200"
            alt="Palace Room"
            className="w-full h-full object-cover filter brightness-[0.7]"
          />

          {/* Active Flag Pin on the Photo */}
          <motion.div
            key={currentFlag.id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ left: `${currentFlag.x}%`, top: `${currentFlag.y}%` }}
            className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full shadow-2xl flex items-center gap-2 transition-all ${
              isRevealed 
                ? 'bg-indigo-600 text-white scale-125' 
                : 'bg-amber-500/90 text-white animate-pulse'
            }`}
          >
            <span className="text-xl">{isRevealed ? currentFlag.emoji : '\u2753'}</span>
          </motion.div>
        </div>

        {/* Timer ring above card */}
        <div className="relative -mt-8 z-20 flex items-center justify-center">
          <svg className="w-20 h-20 transform -rotate-90">
            <circle cx="40" cy="40" r="32" className="stroke-slate-800" strokeWidth="5" fill="#0b0f19" />
            <circle
              cx="40"
              cy="40"
              r="32"
              className={`transition-all duration-300 ${timeLeft <= 3 ? 'stroke-rose-500' : 'stroke-indigo-400'}`}
              strokeWidth="5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>
          <span className={`absolute font-mono text-base font-extrabold ${timeLeft <= 3 ? 'text-rose-400' : 'text-indigo-300'}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Bottom Interactive Answer Card */}
      <div className="max-w-xl mx-auto w-full z-10 mb-6">
        <AnimatePresence mode="wait">
          {!isRevealed ? (
            <motion.div
              key="hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  Target Pin Location
                </span>
                <h3 className="text-base font-bold text-white mt-1">
                  What concept did you anchor at this spot?
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Mentally recall the concept and memory story before revealing.
                </p>
              </div>

              <button
                onClick={handleReveal}
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              >
                <Eye className="w-4 h-4" />
                <span>Reveal Concept</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-6 space-y-4 shadow-2xl"
            >
              <div className="space-y-1 text-center">
                <span className="text-2xl">{currentFlag.emoji}</span>
                <h3 className="text-base font-bold text-white">
                  {currentFlag.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                  {currentFlag.keyPoint}
                </p>
                {currentFlag.note && (
                  <p className="text-[11px] text-indigo-300 italic">
                    Hook: "{currentFlag.note}"
                  </p>
                )}
              </div>

              {/* Self-Grade Recall Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => handleGrade(false)}
                  className="py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <X className="w-4 h-4" />
                  <span>I Didn't Recall</span>
                </button>
                <button
                  onClick={() => handleGrade(true)}
                  className="py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>I Recalled It!</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
