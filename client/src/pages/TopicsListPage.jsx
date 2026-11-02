import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Mic, 
  MapPin, 
  ChevronRight, 
  Search,
  Filter
} from 'lucide-react';
import { initialDashboardData } from '../mockData';
import { MasteryRing } from '../components/MasteryRing';

export default function TopicsListPage() {
  const navigate = useNavigate();
  const [units] = useState(initialDashboardData.units);
  const [search, setSearch] = useState('');

  const allTopics = units.flatMap((u) => u.topics.map((t) => ({ ...t, unitTitle: u.title, unitCode: u.code })));
  const filtered = allTopics.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.unitTitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Topics & Materials
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organized study materials with live active recall status
          </p>
        </div>

        <button
          onClick={() => navigate('/topics/new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Topic (PDF / Photo)</span>
        </button>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter topics by name or unit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
        />
      </div>

      {/* Topics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((topic) => (
          <div
            key={topic.id}
            onClick={() => navigate(`/topics/${topic.id}`)}
            className="p-5 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group shadow-sm flex flex-col justify-between space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <MasteryRing value={topic.mastery} size={50} strokeWidth={4} />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    {topic.unitCode} · {topic.unitTitle}
                  </span>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">
                    {topic.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {topic.keyPointsCovered} of {topic.keyPointsTotal} key points covered
                  </p>
                </div>
              </div>

              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                topic.mastery >= 75 
                  ? 'bg-success/10 text-success border border-success/20' 
                  : topic.mastery >= 50
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-warning/10 text-warning border border-warning/20'
              }`}>
                {topic.status}
              </span>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                {topic.flagsCount} palace pins
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/topics/${topic.id}/explain`);
                  }}
                  className="px-3 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold flex items-center gap-1 text-[11px]"
                >
                  <Mic className="w-3 h-3" />
                  Teach Back
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

