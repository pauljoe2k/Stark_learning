import { useState, type FormEvent } from 'react';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export function LoginPage() {
  const { authenticate } = useAuth();
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await authenticate(signup ? { name, email, password } : { email, password });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to continue. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link to="/" className="brand"><span className="brand-pin" aria-hidden="true" />Pinpoint</Link>
        <p className="eyebrow">EXPLAIN IT. PIN IT. OWN IT.</p>
        <h1 id="auth-title">{signup ? 'Make room to learn.' : 'Welcome back.'}</h1>
        <p className="auth-copy">Build lasting understanding, one idea at a time.</p>
        <form onSubmit={submit} className="auth-form">
          {signup && (
            <label>
              Name
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={255} />
          </label>
          <label>
            Password
            <input type="password" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={signup ? 10 : 1} maxLength={128} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? <LoaderCircle className="spin" size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
            {saving ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
          </button>
        </form>
        <button className="text-button" type="button" onClick={() => { setSignup((value) => !value); setError(''); }}>
          {signup ? 'Already have an account? Sign in' : 'New to Pinpoint? Create an account'}
        </button>
      </section>
    </main>
  );
}
