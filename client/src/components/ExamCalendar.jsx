import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { useExams } from '../hooks/useStudy.js';
import {
  daysUntilExam,
  examSubject,
  examTimeLabel,
  groupExamsByLocalDate,
  localDateKey,
  parseExamDate,
} from '../lib/examCalendar.js';

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function countdownLabel(days) {
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'today';
  return `in ${days} ${days === 1 ? 'day' : 'days'}`;
}

function ExamDetails({ exam, today }) {
  const date = parseExamDate(exam.examDate ?? exam.date);
  const days = date ? daysUntilExam(date, today) : 0;
  return (
    <div className="calendar-popover" role="note">
      <p className="font-bold">{exam.title}</p>
      <p className="text-sm text-muted">{examSubject(exam)}</p>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
        <Clock3 aria-hidden="true" size={13} /> {examTimeLabel(exam.examDate ?? exam.date)}
        <span aria-hidden="true">·</span> {countdownLabel(days)}
      </p>
    </div>
  );
}

export default function ExamCalendar() {
  const { data: exams = [], isLoading, isError } = useExams();
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [direction, setDirection] = useState('next');
  const [openDay, setOpenDay] = useState(null);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const examGroups = useMemo(() => groupExamsByLocalDate(exams), [exams]);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstVisible = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1 - monthStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
    return { day, key: localDateKey(day), inMonth: day.getMonth() === visibleMonth.getMonth() };
  });
  const todayKey = localDateKey(now);
  const upcoming = exams
    .map((exam) => ({ exam, date: parseExamDate(exam.examDate ?? exam.date) }))
    .filter(({ date }) => date && daysUntilExam(date, now) >= 0)
    .sort((a, b) => a.date - b.date)
    .slice(0, 3);

  function moveMonth(amount) {
    setDirection(amount > 0 ? 'next' : 'previous');
    setVisibleMonth((month) => new Date(month.getFullYear(), month.getMonth() + amount, 1));
    setOpenDay(null);
  }

  function handleDayKeyDown(event, dayKey) {
    if (event.key === 'Escape') setOpenDay(null);
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth);

  return (
    <aside aria-label="Exam calendar" className="calendar-panel">
      <div className="calendar-heading">
        <div className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" className="text-pine" size={19} />
          <h2 className="font-heading text-lg font-bold">Exam calendar</h2>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month" className="calendar-nav">
          <ChevronLeft aria-hidden="true" size={18} />
        </button>
        <h3 aria-live="polite" className="min-w-0 text-center text-sm font-bold">{monthLabel}</h3>
        <button type="button" onClick={() => moveMonth(1)} aria-label="Next month" className="calendar-nav">
          <ChevronRight aria-hidden="true" size={18} />
        </button>
      </div>

      <div key={monthLabel} className={`calendar-month month-slide-${direction}`} aria-label={monthLabel}>
        <div className="calendar-grid mt-3" role="grid" aria-label={`${monthLabel} exam dates`}>
          {weekdayNames.map((day) => <span key={day} role="columnheader" className="calendar-weekday">{day}</span>)}
          {calendarDays.map(({ day, key, inMonth }) => {
            const dayExams = examGroups.get(key) ?? [];
            const hasExam = dayExams.length > 0;
            const isToday = key === todayKey;
            const label = hasExam
              ? `${new Intl.DateTimeFormat(undefined, { month: 'long' }).format(day)} ${day.getDate()}, exam: ${dayExams.map((exam) => `${exam.title}, subject: ${examSubject(exam)}`).join('; ')}`
              : new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(day);
            return (
              <div
                role="gridcell"
                key={key}
                className="calendar-cell"
                onMouseEnter={() => hasExam && setOpenDay(key)}
                onMouseLeave={() => hasExam && setOpenDay((current) => current === key ? null : current)}
              >
                <button
                  type="button"
                  aria-label={label}
                  aria-current={isToday ? 'date' : undefined}
                  aria-expanded={hasExam ? openDay === key : undefined}
                  aria-haspopup={hasExam ? 'true' : undefined}
                  onFocus={() => hasExam && setOpenDay(key)}
                  onBlur={() => setOpenDay((current) => current === key ? null : current)}
                  onClick={() => hasExam && setOpenDay(key)}
                  onKeyDown={(event) => handleDayKeyDown(event, key)}
                  className={`calendar-day ${inMonth ? '' : 'calendar-day-outside'} ${isToday ? 'calendar-today' : ''} ${hasExam ? 'calendar-has-exam' : ''}`}
                >
                  <span>{day.getDate()}</span>
                  {hasExam && <span aria-hidden="true" className="calendar-x">×</span>}
                </button>
                {hasExam && openDay === key && (
                  <div className="calendar-day-popover">
                    {dayExams.map((exam) => <ExamDetails key={exam.id} exam={exam} today={now} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <section aria-labelledby="upcoming-exams-heading" className="mt-5 border-t border-line pt-4">
        <h3 id="upcoming-exams-heading" className="text-sm font-bold">Upcoming exams</h3>
        {isLoading ? (
          <div className="mt-3 space-y-3" role="status" aria-label="Loading upcoming exams">
            <div className="skeleton h-12" /><div className="skeleton h-12" />
          </div>
        ) : isError ? (
          <p role="alert" className="mt-3 text-sm text-muted">Exam dates could not be loaded.</p>
        ) : upcoming.length ? (
          <ul className="mt-2 divide-y divide-line">
            {upcoming.map(({ exam, date }) => {
              const days = daysUntilExam(date, now);
              return (
                <li key={exam.id} className="py-2.5 first:pt-1">
                  <p className="line-clamp-2 text-sm font-semibold">{exam.title}</p>
                  <div className="mt-0.5 flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted">{examSubject(exam)}</span>
                    <span className="font-bold text-accent">{countdownLabel(days)}</span>
                  </div>
                  <Link to={exam.unitId ? `/topic?unit=${exam.unitId}` : '/topic'} className="mt-1 inline-block text-xs font-semibold text-pine underline decoration-mustard/70 underline-offset-2">
                    Review notes
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No upcoming dates. Add one from your dashboard.</p>
        )}
      </section>
    </aside>
  );
}
