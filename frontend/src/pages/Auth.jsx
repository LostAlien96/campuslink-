// src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

function AuthForm({ mode }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '', name: '', branch: '', year: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function update(field) {
    return e => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form);
      }
      navigate('/discover');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 40, height: 40,
            background: 'var(--accent)',
            borderRadius: 12,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#fff',
            marginBottom: 12,
          }}>C</div>
          <h1 style={{ fontWeight: 600, fontSize: 20, letterSpacing: '-.03em' }}>CampusLink</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            {mode === 'login' ? 'Sign in to your account' : 'Find your people on campus'}
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div>
              <label className="label">Name</label>
              <input className="input" placeholder="Your full name" value={form.name} onChange={update('name')} required />
            </div>
          )}

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="you@college.edu" value={form.email} onChange={update('email')} required />
          </div>

          <div>
            <label className="label">Password</label>
            <input className="input" type="password" placeholder="Min 8 characters" value={form.password} onChange={update('password')} required />
          </div>

          {mode === 'register' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label">Branch</label>
                <input className="input" placeholder="e.g. CSE" value={form.branch} onChange={update('branch')} />
              </div>
              <div>
                <label className="label">Year</label>
                <select className="input" value={form.year} onChange={update('year')}>
                  <option value="">—</option>
                  {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading}
            style={{ justifyContent: 'center', marginTop: 4 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
          {mode === 'login' ? (
            <>Don't have an account? <Link to="/register" style={{ color: 'var(--accent)' }}>Sign up</Link></>
          ) : (
            <>Already have an account? <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link></>
          )}
        </p>
      </div>
    </div>
  );
}

export function LoginPage()    { return <AuthForm mode="login" />; }
export function RegisterPage() { return <AuthForm mode="register" />; }
