import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, LoaderCircle } from 'lucide-react';
import { useSession } from '../lib/SessionContext.jsx';

export default function Login() {
  const { login, signup } = useSession();
  const navigate = useNavigate();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await (isSignup ? signup({ name, email, password }) : login({ email, password }));
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message || 'Could not sign in.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          <BookOpenCheck aria-hidden="true" className="mx-auto text-moss" size={38} />
          <h1 className="mt-3 text-3xl font-bold">Pinpoint</h1>
          <p className="mt-2 text-slate-600">Explain it. Pin it. Own it.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {isSignup && <label className="block text-sm font-semibold">Name
            <input required autoComplete="name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
          </label>}
          <label className="block text-sm font-semibold">Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
          </label>
          <label className="block text-sm font-semibold">Password
            <input required type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={isSignup ? 8 : 1} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal" />
            {isSignup && <span className="mt-1 block text-xs font-normal text-slate-500">Use at least 8 characters.</span>}
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button type="submit" disabled={pending} className="flex w-full items-center justify-center gap-2 rounded-xl bg-moss px-4 py-3 font-semibold text-white hover:bg-ink disabled:opacity-60">
            {pending && <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />}
            {isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          {isSignup ? 'Already have an account?' : 'New to Pinpoint?'}{' '}
          <button type="button" onClick={() => { setIsSignup((value) => !value); setError(''); }} className="font-semibold text-moss underline">
            {isSignup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </section>
    </main>
  );
}
