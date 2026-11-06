import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, Circle, Flame, Plus, Trash2 } from 'lucide-react';
import { useDashboard, useCreateExam, useDeleteExam, useUpdateExam, useUnits } from '../hooks/useStudy.js';
import { daysUntilExam } from '../lib/examCalendar.js';

function Mastery({ value }) {
  const score = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="flex items-center gap-3" aria-label={`${score}% mastery`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className="progress-fill h-full rounded-full bg-moss" style={{ width: `${score}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-bold">{score}%</span>
    </div>
  );
}

export default function Home() {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const { data: units = [] } = useUnits();
  const createExam = useCreateExam();
  const deleteExam = useDeleteExam();
  const updateExam = useUpdateExam();
  const [examTitle, setExamTitle] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examTime, setExamTime] = useState('');
  const [examUnit, setExamUnit] = useState('');
  const [clock, setClock] = useState(() => new Date());
  const [editingExam, setEditingExam] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  async function addExam(event) {
    event.preventDefault();
    setFormError('');
    try {
      await createExam.mutateAsync({
        title: examTitle.trim(),
        exam_date: new Date(`${examDate}T${examTime || '00:00'}`).toISOString(),
        unitId: examUnit ? Number(examUnit) : null,
      });
      setExamTitle('');
      setExamDate('');
      setExamTime('');
      setExamUnit('');
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  async function saveExam(event) {
    event.preventDefault();
    setFormError('');
    try {
      await updateExam.mutateAsync({
        id: editingExam,
        data: {
          title: examTitle.trim(),
          exam_date: new Date(`${examDate}T${examTime || '00:00'}`).toISOString(),
          unitId: examUnit ? Number(examUnit) : null,
        },
      });
      setEditingExam(null);
      setExamTitle('');
      setExamDate('');
      setExamTime('');
      setExamUnit('');
    } catch (requestError) {
      setFormError(requestError.message);
    }
  }

  function editExam(exam) {
    setEditingExam(exam.id);
    setExamTitle(exam.title);
    const date = new Date(exam.examDate);
    setExamDate(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`);
    setExamTime(date.getHours() || date.getMinutes() ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '');
    setExamUnit(exam.unitId ? String(exam.unitId) : '');
  }

  if (isLoading) return (
    <main className="mx-auto max-w-6xl space-y-6 p-6" role="status" aria-label="Loading your learning dashboard">
      <div className="skeleton h-44 rounded-3xl" />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="skeleton min-h-72 rounded-2xl" />
        <div className="space-y-5"><div className="skeleton h-32 rounded-2xl" /><div className="skeleton h-52 rounded-2xl" /></div>
      </div>
    </main>
  );
  if (isError) return <main className="mx-auto max-w-6xl p-6"><p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">{error.message}</p><button onClick={() => refetch()} className="mt-3 underline">Try again</button></main>;

  const taskMap = new Map(data.tasks.map((item) => [item.topicId, item.tasks]));
  const allTopics = [...data.topics, ...data.units.flatMap((unit) => unit.topics)];
  const completeTasks = data.tasks.flatMap((topic) => topic.tasks).filter((task) => task.done).length;
  const totalTasks = data.tasks.reduce((sum, topic) => sum + topic.tasks.length, 0);
  const nextExamDays = data.nearest_exam
    ? Math.max(0, daysUntilExam(new Date(data.nearest_exam.examDate), clock))
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 pb-24 sm:px-8 sm:py-10">
      <section className="dashboard-enter rounded-3xl bg-ink px-5 py-7 text-white sm:px-8 sm:py-9">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-200">Your learning loop</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{data.greeting}</h1>
        <p className="mt-2 max-w-xl text-white/75">Explain what you know, find the gaps, then pin each idea somewhere you remember.</p>
        {data.streak_days > 0 && (
          <p aria-label={`${data.streak_days} day recall streak`} className={`mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-bold ${data.streak_days > 1 ? 'streak-celebrate' : ''}`}>
            <Flame aria-hidden="true" size={16} className="text-mustard" /> {data.streak_days}-day recall streak
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/topic" className="study-topic-link inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-semibold">Study a topic <ArrowRight size={17} /></Link>
          <Link to="/recall" className="rounded-xl border border-white/40 px-4 py-2.5 font-semibold hover:bg-white/10">Start Recall</Link>
        </div>
      </section>

      <section className="mt-7 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
        <div className="dashboard-enter rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Your topics</h2>
              <p className="mt-1 text-sm text-slate-600">{completeTasks} of {totalTasks} learning tasks complete</p>
            </div>
            <Link to="/topic" className="inline-flex items-center gap-1 font-semibold text-moss hover:text-ink"><Plus size={18} /> Add topic</Link>
          </div>
          {allTopics.length === 0 ? (
            <div className="mt-5 rounded-xl bg-paper p-6 text-center">
              <p className="font-semibold">No topics yet</p>
              <p className="mt-1 text-sm text-slate-600">Add a PDF, photo, or key points to begin.</p>
            </div>
          ) : (
            <div className="mt-4 divide-y divide-slate-100">
              {allTopics.map((topic) => {
                const tasks = taskMap.get(topic.id) ?? [];
                return (
                  <article key={topic.id} className="py-4 first:pt-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <Link to={`/topic?selected=${topic.id}`} className="font-bold hover:underline">{topic.title}</Link>
                        <div className="mt-1 max-w-xs"><Mastery value={topic.mastery} /></div>
                      </div>
                      <Link to={`/explain?topic=${topic.id}`} className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-paper">Explain</Link>
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      {tasks.map((task) => (
                        <li key={task.id} className={`inline-flex items-center gap-1.5 text-xs font-medium ${task.done ? 'text-moss' : 'text-slate-500'}`}>
                          {task.done ? <Check aria-hidden="true" size={14} /> : <Circle aria-hidden="true" size={13} />}
                          {task.title}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <section
            data-tone={data.nearest_exam?.tone ?? 'calm'}
            className="next-exam-card dashboard-enter rounded-2xl border p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 font-semibold"><CalendarDays aria-hidden="true" size={19} /> Next exam</div>
            {data.nearest_exam ? (
              <div className="mt-3 flex items-end gap-3">
                <span key={nextExamDays} className="next-exam-number text-5xl font-bold tabular-nums">{nextExamDays}</span>
                <div className="pb-1"><p className="font-semibold">{nextExamDays === 1 ? 'day left' : 'days left'}</p><p className="next-exam-description text-sm">{data.nearest_exam.title} · {new Date(data.nearest_exam.examDate).toLocaleDateString()}</p></div>
              </div>
            ) : <p className="next-exam-description mt-3 text-sm">No upcoming exams. Add a date to keep it in view.</p>}
          </section>
          <section className="dashboard-enter rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold">Exam dates</h2>
            <form onSubmit={editingExam ? saveExam : addExam} className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="sr-only" htmlFor="exam-title">Exam title</label>
              <input id="exam-title" required value={examTitle} onChange={(event) => setExamTitle(event.target.value)} placeholder="e.g. Biology exam" className="rounded-xl border border-slate-300 bg-white px-3 py-2 sm:col-span-2" />
              <label className="sr-only" htmlFor="exam-date">Exam date</label>
              <input id="exam-date" required type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" />
              <label className="sr-only" htmlFor="exam-time">Exam time (optional)</label>
              <input id="exam-time" type="time" value={examTime} onChange={(event) => setExamTime(event.target.value)} aria-label="Exam time (optional)" className="rounded-xl border border-slate-300 bg-white px-3 py-2" />
              <label className="sr-only" htmlFor="exam-unit">Subject or unit</label>
              <select id="exam-unit" value={examUnit} onChange={(event) => setExamUnit(event.target.value)} aria-label="Subject or unit" className="rounded-xl border border-slate-300 bg-white px-3 py-2 sm:col-span-2">
                <option value="">General subject</option>
                {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.title}</option>)}
              </select>
              <button disabled={createExam.isPending || updateExam.isPending} className="inline-flex items-center justify-center gap-1 rounded-xl bg-accent px-3 py-2 font-semibold text-white hover:bg-ink disabled:opacity-50 sm:col-span-2"><Plus size={17} /> {editingExam ? 'Save exam' : 'Add exam'}</button>
              {editingExam && <button type="button" onClick={() => { setEditingExam(null); setExamTitle(''); setExamDate(''); setExamTime(''); setExamUnit(''); }} className="rounded-xl border border-slate-300 px-3 py-2 font-semibold sm:col-span-2">Cancel edit</button>}
            </form>
            {formError && <p role="alert" className="mt-2 text-sm text-red-800">{formError}</p>}
            <ul className="mt-4 divide-y divide-slate-100">
              {data.exams.map((exam) => <li key={exam.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span><button type="button" onClick={() => editExam(exam)} className="text-left font-semibold hover:underline">{exam.title}</button><span className="ml-2 text-slate-500">{new Date(exam.examDate).toLocaleDateString()}</span></span>
                <button type="button" disabled={deleteExam.isPending} onClick={() => deleteExam.mutate(exam.id)} aria-label={`Delete ${exam.title}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-800"><Trash2 size={16} /></button>
              </li>)}
            </ul>
          </section>
        </div>
      </section>
    </main>
  );
}