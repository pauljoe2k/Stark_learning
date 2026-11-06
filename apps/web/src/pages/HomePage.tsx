import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BookOpen, Check, Circle, Clock3, MapPin, Mic2, Plus, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { TopicTasks } from '@pinpoint/shared';
import { api } from '../api';
import { useAuth } from '../auth';
import { MasteryRing } from '../components/MasteryRing';
import { useSocket } from '../socket';

const taskRows: ReadonlyArray<{ key: keyof TopicTasks; label: string; to: string }> = [
  { key: 'addMaterial', label: 'Add material', to: '/topic' },
  { key: 'explain', label: 'Explain it', to: '/explain' },
  { key: 'pin', label: 'Pin it', to: '/palace' },
  { key: 'recall', label: 'Recall it', to: '/recall' },
];

export function HomePage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const topicsQuery = useQuery({
    queryKey: ['topics', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load topics.');
      return (await api.topics(token)).topics;
    },
    enabled: Boolean(token),
  });
  const placesQuery = useQuery({
    queryKey: ['places', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load places.');
      return (await api.places(token)).places;
    },
    enabled: Boolean(token),
  });
  const dueQuery = useQuery({
    queryKey: ['due-flags', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load due reviews.');
      return (await api.dueFlags(token)).flags;
    },
    enabled: Boolean(token),
  });
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', token],
    queryFn: async () => {
      if (!token) throw new Error('Sign in to load tasks.');
      return api.dashboard(token);
    },
    enabled: Boolean(token),
  });
  useEffect(() => {
    if (!socket) return;
    const invalidateDashboard = () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', token] });
    };
    socket.on('dashboard:updated', invalidateDashboard);
    return () => {
      socket.off('dashboard:updated', invalidateDashboard);
    };
  }, [socket, queryClient, token]);

  const tasksByTopic = new Map((dashboardQuery.data?.topics ?? []).map((item) => [item.topicId, item.tasks]));

  const topics = topicsQuery.data ?? [];
  const places = placesQuery.data ?? [];
  const dueCount = dueQuery.data?.length;
  const nextStep = topicsQuery.isSuccess && topics.length === 0
    ? { title: 'Add your first topic', detail: 'Start with notes or a short topic you want to understand.', to: '/topic', icon: Plus }
    : placesQuery.isSuccess && places.length === 0
      ? { title: 'Build your first memory palace', detail: 'Choose a familiar place and pin ideas to memorable spots.', to: '/palace', icon: MapPin }
      : { title: 'Practice active recall', detail: 'Test what you remember and revisit ideas that need more practice.', to: '/recall', icon: RotateCcw };
  const NextStepIcon = nextStep.icon;

  return (
    <section className="home-dashboard">
      <header className="home-heading">
        <div>
          <span className="eyebrow">PINPOINT / HOME</span>
          <h1>Welcome back{user?.name ? `, ${user.name}` : ''}.</h1>
          <p>Understand an idea, place it somewhere familiar, then come back and recall it.</p>
        </div>
        <Link className="primary-button home-primary-action" to={nextStep.to}>
          <NextStepIcon size={17} aria-hidden="true" /> {nextStep.title}
        </Link>
      </header>

      <div className="home-stat-grid" aria-label="Learning overview">
        <article className="home-stat-card">
          <BookOpen size={19} aria-hidden="true" />
          <span className="eyebrow">TOPICS</span>
          <strong>{topicsQuery.isPending ? '—' : topics.length}</strong>
          <Link to="/topic">Open topics <ArrowRight size={14} /></Link>
        </article>
        <article className="home-stat-card">
          <MapPin size={19} aria-hidden="true" />
          <span className="eyebrow">PLACES</span>
          <strong>{placesQuery.isPending ? '—' : places.length}</strong>
          <Link to="/palace">Open palace <ArrowRight size={14} /></Link>
        </article>
        <article className="home-stat-card">
          <Clock3 size={19} aria-hidden="true" />
          <span className="eyebrow">DUE TO REVIEW</span>
          <strong>{dueQuery.isPending ? '—' : dueQuery.isError ? '!' : dueCount}</strong>
          <Link to="/recall">Review now <ArrowRight size={14} /></Link>
        </article>
      </div>

      <div className="home-content-grid">
        <section className="home-section home-next-step">
          <span className="eyebrow">YOUR NEXT STEP</span>
          <div className="home-next-step-body">
            <span className="home-step-icon"><NextStepIcon size={20} aria-hidden="true" /></span>
            <div>
              <h2>{nextStep.title}</h2>
              <p>{nextStep.detail}</p>
            </div>
          </div>
          {dueCount !== undefined && dueCount > 0 && (
            <Link className="home-due-link" to="/recall">{dueCount} {dueCount === 1 ? 'flag is' : 'flags are'} ready for spaced review <ArrowRight size={15} /></Link>
          )}
        </section>

        <section className="home-section home-workflow">
          <span className="eyebrow">THE PINPOINT LOOP</span>
          <Link to="/topic"><span>01</span><BookOpen size={17} /> Add and organize a topic <ArrowRight size={15} /></Link>
          <Link to="/explain"><span>02</span><Mic2 size={17} /> Explain it in your own words <ArrowRight size={15} /></Link>
          <Link to="/palace"><span>03</span><MapPin size={17} /> Pin ideas to a familiar place <ArrowRight size={15} /></Link>
          <Link to="/recall"><span>04</span><RotateCcw size={17} /> Recall, review, and repeat <ArrowRight size={15} /></Link>
        </section>
      </div>

      <section className="home-section home-topics">
        <div className="home-section-heading">
          <div><span className="eyebrow">KEEP LEARNING</span><h2>Your topics</h2></div>
          <Link className="text-button" to="/topic">All topics <ArrowRight size={15} /></Link>
        </div>
        {topicsQuery.isPending && <p className="home-empty">Loading your topics…</p>}
        {topicsQuery.isError && <p className="form-error" role="alert">Topics could not be loaded: {topicsQuery.error.message}</p>}
        {placesQuery.isError && <p className="form-error" role="alert">Places could not be loaded: {placesQuery.error.message}</p>}
        {dueQuery.isError && <p className="form-error" role="alert">Review schedule could not be loaded: {dueQuery.error.message}</p>}
        {topicsQuery.isSuccess && topics.length === 0 && (
          <div className="home-empty"><p>Your learning space is ready when you are.</p><Link className="text-button" to="/topic">Create a topic <ArrowRight size={15} /></Link></div>
        )}
        {topics.slice(0, 4).map((topic) => {
          const tasks = tasksByTopic.get(topic.id);
          const nextTask = taskRows.find(({ key }) => !(tasks?.[key] ?? false));
          return (
            <article className="home-topic-row" key={topic.id}>
              <span className="home-topic-mark"><BookOpen size={17} aria-hidden="true" /></span>
              <div>
                <h3>{topic.title}</h3><p>{topic.unit?.title ?? 'Unsorted'} · {topic.keyPoints.length} key {topic.keyPoints.length === 1 ? 'idea' : 'ideas'} · {topic.topicFiles.length} {topic.topicFiles.length === 1 ? 'file' : 'files'}</p>
                <ul className="home-task-list">
                  {taskRows.map(({ key, label }) => {
                    const done = Boolean(tasks?.[key]);
                    return (
                      <li key={key} className={done ? 'home-task-done' : 'home-task-todo'}>
                        {done
                          ? <Check size={14} aria-hidden="true" />
                          : <Circle size={14} aria-hidden="true" />}
                        <span>{label}</span>
                      </li>
                    );
                  })}
                </ul>
                {nextTask && (
                  <Link className="text-button" to={nextTask.to} aria-label={`Next step for ${topic.title}: ${nextTask.label}`}>Next step <ArrowRight size={15} /></Link>
                )}
              </div>
              <MasteryRing value={topic.mastery ?? 0} size={56} />
              <Link className="text-button" to="/explain" aria-label={`Explain ${topic.title}`}>Explain <ArrowRight size={15} /></Link>
            </article>
          );
        })}
      </section>
    </section>
  );
}
