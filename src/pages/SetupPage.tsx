import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Watch } from 'lucide-react';
import { accountStore, useAccount, type DeviceConfig } from '../store/accountStore';
import { Logo, ThemeToggle } from '../components/ui';
import { ContactForm } from './ContactsPage';
import type { EmergencyContact } from '../types';

const STEPS = ['Add device', 'Connect', 'Emergency contact', 'Ready'];

export function SetupPage() {
  const account = useAccount();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [device, setDevice] = useState<DeviceConfig>({ name: 'SENTRA Band', id: 'SENTRA-001', wearer: '' });
  const [contact, setContact] = useState<Omit<EmergencyContact, 'id' | 'userId'> | null>(null);
  const [found, setFound] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (step !== 1) return;
    setFound(false);
    const t = window.setTimeout(() => setFound(true), 2600);
    return () => window.clearTimeout(t);
  }, [step]);

  if (!account.signedIn) return <Navigate to="/login" replace />;

  const deviceValid = device.name.trim() && /^[A-Za-z0-9-]{4,}$/.test(device.id.trim()) && device.wearer.trim();

  return (
    <div className="setup">
      <div className="theme-float">
        <ThemeToggle />
      </div>
      <div className="card setup-card">
        <Logo />
        <ol className="stepper" aria-label="Setup progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i < step ? 'done' : i === step ? 'current' : ''} aria-current={i === step ? 'step' : undefined}>
              {i + 1}. {s}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <form
            className="setup-step"
            onSubmit={(e) => {
              e.preventDefault();
              setTouched(true);
              if (deviceValid) setStep(1);
            }}
            noValidate
          >
            <h2>Add your device</h2>
            <p>You'll find the device ID printed on the back of the band.</p>
            <div className="form">
              <div className="field">
                <label htmlFor="d-name">Device name</label>
                <input id="d-name" className="input" value={device.name} onChange={(e) => setDevice({ ...device, name: e.target.value })} aria-invalid={touched && !device.name.trim()} />
              </div>
              <div className="field">
                <label htmlFor="d-id">Device ID</label>
                <input id="d-id" className="input num" value={device.id} onChange={(e) => setDevice({ ...device, id: e.target.value.toUpperCase() })} aria-invalid={touched && !/^[A-Za-z0-9-]{4,}$/.test(device.id)} />
                {touched && !/^[A-Za-z0-9-]{4,}$/.test(device.id) && <span className="error">Use the ID on the band, for example SENTRA-001.</span>}
              </div>
              <div className="field">
                <label htmlFor="d-wearer">Who wears it?</label>
                <input id="d-wearer" className="input" placeholder="Grandma" value={device.wearer} onChange={(e) => setDevice({ ...device, wearer: e.target.value })} aria-invalid={touched && !device.wearer.trim()} />
                <span className="hint">Shown on alerts, like "Grandma's SENTRA Band".</span>
                {touched && !device.wearer.trim() && <span className="error">Enter a name for the person wearing the band.</span>}
              </div>
              <button className="btn btn-primary btn-lg btn-block" type="submit">
                Continue
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <div className="setup-step">
            <h2>Connect device</h2>
            <p>Turn the band on and keep it near your Wi-Fi router.</p>
            <div className="search-visual" role="status" aria-live="polite">
              <div className={`orb ${found ? 'found' : ''}`}>{found ? <CheckCircle2 size={48} /> : <Watch size={44} />}</div>
              {found ? (
                <div>
                  <strong style={{ fontSize: 18 }}>🟢 Device connected</strong>
                  <p className="muted num">
                    {device.name} ({device.id})
                  </p>
                </div>
              ) : (
                <div>
                  <strong style={{ fontSize: 18 }}>Searching for device…</strong>
                  <p className="muted num">Looking for {device.id}</p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button className="btn btn-lg btn-ghost" onClick={() => setStep(0)}>
                Back
              </button>
              <button className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={!found} onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="setup-step">
            <h2>Emergency contact</h2>
            <p>This person is notified if a fall isn't resolved in time or {device.wearer || 'the wearer'} presses SOS.</p>
            <ContactForm
              initial={contact ?? undefined}
              submitLabel="Save"
              onSubmit={(c) => {
                setContact(c);
                setStep(3);
              }}
              onCancel={() => setStep(1)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="setup-step" style={{ textAlign: 'center' }}>
            <div className="search-visual">
              <div className="orb found">
                <ShieldCheck size={50} />
              </div>
            </div>
            <h2>You're ready</h2>
            <p>Your SENTRA system is now monitoring the wearable.</p>
            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={() => {
                accountStore.completeSetup({ ...device, name: device.name.trim(), wearer: device.wearer.trim() }, contact);
                navigate('/app');
              }}
            >
              OPEN DASHBOARD
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
