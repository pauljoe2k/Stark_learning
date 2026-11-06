import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react';
import { useSession } from '../lib/SessionContext.jsx';

export default function Login() {
  const { login, signup, resetPassword } = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function switchMode(newMode) {
    setMode(newMode);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  }

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError('');
    setSuccess('');

    try {
      if (mode === 'signup') {
        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setPending(false);
          return;
        }
        await signup({ name, email, password });
        navigate('/', { replace: true });
      } else if (mode === 'login') {
        await login({ email, password });
        navigate('/', { replace: true });
      } else if (mode === 'forgot') {
        if (password.length < 8) {
          setError('New password must be at least 8 characters long.');
          setPending(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match. Please re-enter.');
          setPending(false);
          return;
        }
        await resetPassword({ email, password });
        setSuccess('Password updated successfully! Signing you in…');
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 800);
      }
    } catch (requestError) {
      setError(requestError.message || (mode === 'forgot' ? 'Could not reset password.' : 'Could not sign in.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-7 text-center">
          {mode === 'forgot' ? (
            <KeyRound aria-hidden="true" className="mx-auto text-moss" size={38} />
          ) : (
            <BookOpenCheck aria-hidden="true" className="mx-auto text-moss" size={38} />
          )}
          <h1 className="mt-3 text-3xl font-bold">
            {mode === 'forgot' ? 'Reset password' : 'Pinpoint'}
          </h1>
          <p className="mt-2 text-slate-600">
            {mode === 'forgot'
              ? 'Enter your registered email and choose a new password.'
              : 'Explain it. Pin it. Own it.'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <label className="block text-sm font-semibold">
              Name
              <input
                required
                autoComplete="name"
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
            </label>
          )}

          <label className="block text-sm font-semibold">
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
            />
          </label>

          {mode !== 'forgot' ? (
            <label className="block text-sm font-semibold">
              <div className="flex items-center justify-between">
                <span>Password</span>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-moss hover:underline"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                required
                type="password"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                minLength={mode === 'signup' ? 8 : 1}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
              />
              {mode === 'signup' && (
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Use at least 8 characters.
                </span>
              )}
            </label>
          ) : (
            <>
              <label className="block text-sm font-semibold">
                New password
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold">
                Confirm new password
                <input
                  required
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 font-normal"
                />
              </label>
            </>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          {success && (
            <div role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900 font-medium">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-moss px-4 py-3 font-semibold text-white hover:bg-ink disabled:opacity-60 transition"
          >
            {pending && <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />}
            {mode === 'signup'
              ? 'Create account'
              : mode === 'forgot'
              ? 'Reset password & sign in'
              : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 space-y-2 text-center text-sm text-slate-600">
          {mode === 'forgot' ? (
            <p>
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold text-moss underline"
              >
                Back to sign in
              </button>
            </p>
          ) : (
            <p>
              {mode === 'signup' ? 'Already have an account?' : 'New to Pinpoint?'}{' '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'signup' ? 'login' : 'signup')}
                className="font-semibold text-moss underline"
              >
                {mode === 'signup' ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
