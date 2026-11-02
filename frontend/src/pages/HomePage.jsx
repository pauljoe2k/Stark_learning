import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  Mic, 
  MapPin, 
  BrainCircuit, 
  Clock, 
  BookOpen, 
  Plus, 
  ArrowUpRight, 
  CheckCircle2, 
  Calendar as CalIcon,
  Flame,
  AlertTriangle
} from 'lucide-react';
import { MasteryRing } from '../components/MasteryRing';
import { ExamCalendar } from '../components/ExamCalendar';
import { initialDashboardData } from '../mockData';
import { formatTimeLeft } from '../lib/utils';
import { motion } from 'framer-motion';

export default function HomePage() {
  const navigate = useNavigate();
  const [data, setData] = useState(initialDashboardData);
  const [exams, setExams] = useState([
    {
      id: 101,
      title: 'Neurobiology & Physiology Midterm',
      unitTitle: 'Unit 3: Cellular Neuroscience',
      targetDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 102,
      title: 'Plant Metabolism Quiz',
      unitTitle: 'Unit 4: Bioenergetics',
      targetDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ]);

  const [studyHistory, setStudyHistory] = useState([
    { date: new Date().toISOString(), title: 'Explained Photosystem II', type: 'Voice Explain', score: 85 },
    { date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), title: 'Recalled Apartment Palace', type: 'Memory Recall', score: 90 },
    { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), title: 'Explained Action Potential', type: 'Voice Explain', score: 62 },
  ]);

  // Nearest Exam Calculation
  const sortedExams = [...exams].sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
  const nearestExam = sortedExams[0];
  const countdown = nearestExam ? formatTimeLeft(nearestExam.targetDate) : null;

  const handleAddExam = (newExam) => {
    setExams((prev) => [...prev, newExam]);
  };

  const handleDeleteExam = (examId) => {
    setExams((prev) => prev.filter((e) => e.id !== examId));
  };

  const toggleTask = (taskId) => {
    setData((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
          : t
      ),
    }));
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Greeting & Quick CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs tracking-wider uppercase mb-1">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Active Recall & Spatial Retention</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Welcome back, {data.user.name} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build your memory palace one explanation at a time.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/explain')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/25 hover:bg-primary/90 transition-all hover:scale-[1.02]"
          >
            <Mic className="w-4 h-4" />
            <span>Teach It Back (Voice)</span>
          </button>
          <button
            onClick={() => navigate('/palace')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-card border border-border text-foreground font-semibold text-xs hover:bg-muted/60 transition-all"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span>View Palace</span>
          </button>
        </div>
      </div>

      {/* 2. Nearest Exam Countdown Hero Card (Urgent color shift if < 7 days) */}
      {nearestExam && (
        <section 
          className={`relative overflow-hidden rounded-3xl p-6 sm:p-7 border transition-all ${
            countdown.isUrgent
              ? 'bg-gradient-to-br from-danger/10 via-card to-warning/10 border-danger/40 shadow-lg shadow-danger/5'
              : 'bg-gradient-to-br from-primary/10 via-card to-accent/20 border-primary/30 shadow-md'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                  countdown.isUrgent ? 'bg-danger text-danger-foreground' : 'bg-primary text-primary-foreground'
                }`}>
                  {countdown.isUrgent ? '⚠️ Urgent Exam Countdown' : 'Upcoming Exam'}
                </span>
                <span className="text-xs text-muted-foreground">{nearestExam.unitTitle}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                {nearestExam.title}
              </h2>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Scheduled for {new Date(nearestExam.targetDate).toLocaleDateString()}</span>
              </p>
            </div>

            {/* Countdown Numbers */}
            <div className="flex items-center gap-3 bg-card/80 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-border self-start md:self-auto">
              {[
                { label: 'DAYS', val: countdown.days },
                { label: 'HOURS', val: countdown.hours },
                { label: 'MINUTES', val: countdown.mins },
              ].map((c, i) => (
                <div key={i} className="flex flex-col items-center min-w-[55px]">
                  <span className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                    countdown.isUrgent ? 'text-danger' : 'text-primary'
                  }`}>
                    {String(c.val).padStart(2, '0')}
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground tracking-wider">
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. Side-by-Side Section: Units & Topics (Taking most space, 7-8 cols) + Exam Calendar (Right side, 4-5 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left: Units & Topics Grid (Occupies 7 of 12 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Units & Topics
              </h2>
              <p className="text-xs text-muted-foreground">
                Mastery calculated from AI gap coverage and memory palace recall.
              </p>
            </div>
            <button
              onClick={() => navigate('/topics/new')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Topic
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {data.units.flatMap((unit) => 
              unit.topics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => navigate(`/topics/${topic.id}`)}
                  className="p-4 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <MasteryRing value={topic.mastery} size={48} strokeWidth={4.5} />
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
                        {unit.title}
                      </span>
                      <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {topic.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {topic.keyPointsCovered}/{topic.keyPointsTotal} points · {topic.flagsCount} palace pins
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      {topic.flagsCount} flags
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/topics/${topic.id}/explain`);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold flex items-center gap-1 transition-colors"
                      title="Explain topic aloud"
                    >
                      <Mic className="w-3 h-3" />
                      <span>Teach Back</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Calendar Section (Occupies 5 of 12 cols on desktop) */}
        <div className="lg:col-span-5 h-full">
          <ExamCalendar 
            exams={exams} 
            studyActivity={studyHistory} 
            onAddExam={handleAddExam} 
            onDeleteExam={handleDeleteExam}
          />
        </div>

      </section>

      {/* 4. Auto-Generated Task List with Deep Links */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning" />
            Auto-Generated Task List
          </h2>
          <p className="text-xs text-muted-foreground">
            Prioritized actions derived from your active recall gaps and exam schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.tasks.map((task) => {
            const isDone = task.status === 'completed';
            return (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 ${
                  isDone 
                    ? 'bg-muted/30 border-border/40 opacity-60' 
                    : 'bg-card border-border hover:border-primary/40 shadow-sm'
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-0.5 flex-shrink-0 transition-colors ${
                    isDone ? 'text-success' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label="Toggle task completion"
                >
                  <CheckCircle2 className={`w-5 h-5 ${isDone ? 'fill-success/20' : ''}`} />
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                      {task.badge}
                    </span>
                    {task.priority === 'urgent' && (
                      <span className="text-[10px] font-bold text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20">
                        Urgent
                      </span>
                    )}
                  </div>
                  <h4 className={`text-xs font-bold leading-snug ${isDone ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{task.duration} · {task.unit}</span>
                  </p>
                </div>

                {!isDone && (
                  <button
                    onClick={() => {
                      if (task.type === 'explain') navigate('/explain');
                      else if (task.type === 'pin' || task.type === 'recall') navigate('/palace');
                      else navigate('/topics/new');
                    }}
                    className="p-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-all hover:scale-105"
                    title="Go to task"
                  >
                    <ArrowUpRight className="w-4 h-4 text-primary" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
