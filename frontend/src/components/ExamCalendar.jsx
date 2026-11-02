import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  isToday
} from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Calendar as CalIcon, 
  Clock, 
  GraduationCap, 
  CheckCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ExamCalendar({ exams = [], studyActivity = [], onAddExam, onDeleteExam, compact = false }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUnit, setNewUnit] = useState('Neurobiology');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Leading pad days for week start alignment (Sunday start)
  const startDayIndex = monthStart.getDay();
  const padDays = Array.from({ length: startDayIndex });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const getDayExams = (day) => {
    return exams.filter((e) => isSameDay(new Date(e.targetDate || e.exam_date), day));
  };

  const getDayActivity = (day) => {
    return studyActivity.filter((a) => isSameDay(new Date(a.date), day));
  };

  const selectedDayExams = getDayExams(selectedDate);
  const selectedDayActivity = getDayActivity(selectedDate);

  const handleCreateExam = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAddExam({
      id: Date.now(),
      title: newTitle,
      unitTitle: newUnit,
      targetDate: selectedDate.toISOString(),
    });
    setNewTitle('');
    setIsAddingExam(false);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm overflow-hidden flex flex-col h-full">
      
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <CalIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <p className="text-[10px] text-muted-foreground">Exams & Study Trail</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={goToToday}
            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-border hover:bg-muted text-foreground transition-colors"
          >
            Today
          </button>
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Days Grid */}
      <div className="mt-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
            <span key={i} className="text-[11px] font-semibold text-muted-foreground">
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {padDays.map((_, i) => (
            <div key={`pad-${i}`} className="h-9 sm:h-10 rounded-xl bg-transparent" />
          ))}

          {days.map((day) => {
            const dayExams = getDayExams(day);
            const dayActivities = getDayActivity(day);
            const isSelected = isSameDay(day, selectedDate);
            const todayFlag = isToday(day);

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`h-9 sm:h-10 rounded-xl p-1 flex flex-col items-center justify-between transition-all relative border ${
                  isSelected 
                    ? 'border-primary bg-primary/10 shadow-sm' 
                    : todayFlag
                    ? 'border-primary/40 bg-accent/40 hover:bg-accent/60'
                    : 'border-transparent hover:border-border hover:bg-muted/40'
                }`}
              >
                <span className={`text-[11px] font-bold leading-none ${
                  isSelected ? 'text-primary' : todayFlag ? 'text-primary font-extrabold' : 'text-foreground'
                }`}>
                  {format(day, 'd')}
                </span>

                {/* Marker dots */}
                <div className="flex items-center justify-center gap-0.5 w-full">
                  {dayExams.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" title="Exam scheduled" />
                  )}
                  {dayActivities.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-success" title="Study completed" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-3 pt-2.5 border-t border-border">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>Exam</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span>Study Day</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full border border-primary" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Selected Day Agenda Box */}
      <div className="mt-4 pt-3 border-t border-border flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Selected Day</span>
              <h4 className="text-xs font-bold text-foreground">
                {format(selectedDate, 'EEEE, MMM do')}
              </h4>
            </div>
            <button
              onClick={() => setIsAddingExam(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              <Plus className="w-3 h-3" />
              Add Exam
            </button>
          </div>

          {/* Add Exam inline popup/form */}
          <AnimatePresence>
            {isAddingExam && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreateExam}
                className="mt-2 p-2.5 bg-muted/40 border border-primary/30 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-foreground">Schedule Exam</span>
                  <button type="button" onClick={() => setIsAddingExam(false)}>
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Exam title (e.g. Midterm)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="Unit name"
                  value={newUnit}
                  onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingExam(false)}
                    className="px-2 py-0.5 text-[10px] rounded border border-border hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground rounded shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Agenda Event Cards */}
          <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
            {selectedDayExams.length === 0 && selectedDayActivity.length === 0 && !isAddingExam && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-[11px]">No exams or activity on this date.</p>
              </div>
            )}

            {selectedDayExams.map((exam) => (
              <div 
                key={exam.id}
                className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 flex items-start justify-between gap-2"
              >
                <div className="flex items-start gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5 text-danger flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[11px] font-bold text-danger leading-tight block">
                      {exam.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {exam.unitTitle || 'General'}
                    </span>
                  </div>
                </div>
                {onDeleteExam && (
                  <button
                    onClick={() => onDeleteExam(exam.id)}
                    className="text-muted-foreground hover:text-danger p-0.5"
                    title="Delete exam"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {selectedDayActivity.map((act, i) => (
              <div 
                key={i}
                className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-center gap-2"
              >
                <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                <div className="truncate">
                  <p className="text-[11px] font-semibold text-foreground truncate">{act.title}</p>
                  <p className="text-[10px] text-muted-foreground">{act.type} · Score: {act.score}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 text-[10px] text-muted-foreground italic text-center">
          Tap any date above to review or add exam schedules.
        </div>
      </div>

    </div>
  );
}
