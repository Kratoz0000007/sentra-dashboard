import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, MapPin, ShieldCheck, Siren } from 'lucide-react';
import { accountStore, useAccount } from '../store/accountStore';
import { Logo, ThemeToggle } from '../components/ui';

/** Abstract band: orbit rings around the wearable and a motion trace that spikes at impact. */
function AuthVisual() {
  return (
    <svg className="auth-visual" viewBox="0 0 600 600" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6e8fff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#6e8fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="trace" x1="0" x2="1">
          <stop offset="0%" stopColor="#6e8fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#6e8fff" />
          <stop offset="62%" stopColor="#ff4d5e" />
          <stop offset="80%" stopColor="#6e8fff" />
          <stop offset="100%" stopColor="#6e8fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="300" cy="300" r="280" fill="url(#glow)" />
      {[250, 200, 150].map((r, i) => (
        <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#ffffff" strokeOpacity={0.06 + i * 0.03} strokeDasharray={i === 0 ? '2 10' : undefined} />
      ))}
      <g className="orbit">
        <circle cx="300" cy="100" r="5" fill="#6e8fff" />
      </g>
      <g className="orbit slow">
        <circle cx="450" cy="300" r="3.5" fill="#37d3a8" />
      </g>
      {/* The band */}
      <rect x="236" y="190" width="128" height="220" rx="46" fill="#121a2b" stroke="#2a3753" strokeWidth="2" />
      <rect x="256" y="236" width="88" height="128" rx="28" fill="#0b1020" stroke="#6e8fff" strokeOpacity="0.6" strokeWidth="1.5" />
      <circle cx="300" cy="300" r="26" fill="none" stroke="#6e8fff" strokeWidth="3" />
      <path d="M282 300h7l4-8 6 16 4-8h8" fill="none" stroke="#f5f7ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Motion trace across the scene */}
      <path
        className="auth-trace"
        d="M0 470 C 40 466, 60 474, 100 470 S 160 466, 200 470 S 250 474, 280 470 L 300 468 L 320 505 L 340 380 L 358 488 L 372 462 L 386 472 C 420 470, 460 466, 500 470 S 560 474, 600 470"
        fill="none"
        stroke="url(#trace)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="340" cy="380" r="6" fill="#ff4d5e" />
      <circle cx="340" cy="380" r="14" fill="none" stroke="#ff4d5e" strokeOpacity="0.5" className="auth-ping" />
    </svg>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <section className="auth-art">
        <Logo />
        <AuthVisual />
        <h1>Protection that never sleeps.</h1>
        <p>Monitor your wearable. Receive emergency alerts. Respond when it matters.</p>
        <div className="auth-foot">
          <span>
            <ShieldCheck size={16} aria-hidden="true" /> Fall detection
          </span>
          <span>
            <Siren size={16} aria-hidden="true" /> SOS alerts
          </span>
          <span>
            <MapPin size={16} aria-hidden="true" /> Live location
          </span>
        </div>
      </section>
      <main className="auth-panel">
        <div className="theme-float">
          <ThemeToggle />
        </div>
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}

function PasswordInput({ id, value, onChange, invalid, autoComplete }: { id: string; value: string; onChange: (v: string) => void; invalid?: boolean; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input id={id} className="input" type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={invalid} autoComplete={autoComplete} />
      <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export function LoginPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const [email, setEmail] = useState(account.user?.email ?? '');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  if (account.signedIn) return <Navigate to={account.setupComplete ? '/app' : '/setup'} replace />;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!emailOk(email) || password.length < 1) return;
    setBusy(true);
    window.setTimeout(() => {
      accountStore.signIn(email.trim());
      navigate(accountStore.get().setupComplete ? '/app' : '/setup');
    }, 500);
  }

  return (
    <AuthShell>
      <h2>Sign in</h2>
      <p>Open your SENTRA Control Center.</p>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={touched && !emailOk(email)} autoComplete="email" placeholder="you@example.com" />
          {touched && !emailOk(email) && <span className="error">Enter a valid email address.</span>}
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <PasswordInput id="password" value={password} onChange={setPassword} invalid={touched && !password} autoComplete="current-password" />
          {touched && !password && <span className="error">Enter your password.</span>}
        </div>
        <div className="row-between">
          <label className="check">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Remember me
          </label>
          <a href="#" onClick={(e) => e.preventDefault()} style={{ fontWeight: 600, fontSize: 14.5 }}>
            Forgot password?
          </a>
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'SIGN IN'}
        </button>
        <div className="divider">New to SENTRA?</div>
        <Link to="/signup" className="btn btn-lg btn-block">
          CREATE ACCOUNT
        </Link>
      </form>
    </AuthShell>
  );
}

export function SignupPage() {
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [touched, setTouched] = useState(false);
  const errors = {
    name: !f.name.trim() && 'Enter your full name.',
    email: !emailOk(f.email) && 'Enter a valid email address.',
    phone: !/^\+?[\d\s-]{7,}$/.test(f.phone.trim()) && 'Enter a phone number with at least 7 digits.',
    password: f.password.length < 8 && 'Use at least 8 characters.',
    confirm: f.confirm !== f.password && "Passwords don't match.",
  };
  const err = (k: keyof typeof errors) => (touched ? errors[k] : false);

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.values(errors).some(Boolean)) return;
    accountStore.signUp({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() });
    navigate('/setup');
  }

  const field = (k: keyof typeof f, label: string, type = 'text', autoComplete = 'off') => (
    <div className="field">
      <label htmlFor={`su-${k}`}>{label}</label>
      {type === 'password' ? (
        <PasswordInput id={`su-${k}`} value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} invalid={!!err(k)} autoComplete={autoComplete} />
      ) : (
        <input id={`su-${k}`} className="input" type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-invalid={!!err(k)} autoComplete={autoComplete} />
      )}
      {err(k) && <span className="error">{err(k)}</span>}
    </div>
  );

  return (
    <AuthShell>
      <h2>Create your account</h2>
      <p>Then connect the band and add someone to call in an emergency.</p>
      <form className="form" onSubmit={submit} noValidate>
        {field('name', 'Full name', 'text', 'name')}
        <div className="grid-2">
          {field('email', 'Email', 'email', 'email')}
          {field('phone', 'Phone', 'tel', 'tel')}
        </div>
        <div className="grid-2">
          {field('password', 'Password', 'password', 'new-password')}
          {field('confirm', 'Confirm password', 'password', 'new-password')}
        </div>
        <button className="btn btn-primary btn-lg btn-block" type="submit">
          CREATE SENTRA ACCOUNT
        </button>
        <p className="muted" style={{ textAlign: 'center', fontSize: 14.5 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
