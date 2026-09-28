import { useNavigate, Link } from 'react-router-dom';
import { ChevronRight, LogOut, RotateCcw, UserRound } from 'lucide-react';
import { accountStore, useAccount } from '../store/accountStore';
import { hardwareService, useHardware } from '../services/hardwareService';
import { Switch } from '../components/ui';

export function SettingsPage() {
  const account = useAccount();
  const { transport, device } = useHardware();
  const navigate = useNavigate();
  const u = account.user;

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Profile and settings</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 18, maxWidth: 760 }}>
        <section className="card contact" aria-label="Your profile">
          <div className="avatar" style={{ width: 52, height: 52, fontSize: 20, cursor: 'default' }} aria-hidden="true">
            {u?.name ? u.name.slice(0, 1).toUpperCase() : <UserRound size={22} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <h3>{u?.name || 'Demo account'}</h3>
            <p className="muted">
              {u?.email}
              {u?.phone ? `, ${u.phone}` : ''}
            </p>
          </div>
        </section>

        <section className="card" aria-labelledby="set-alerts">
          <h3 className="card-title" id="set-alerts" style={{ marginBottom: 18 }}>
            Alerts and display
          </h3>
          <div className="setting">
            <div>
              <h4>Dark mode</h4>
              <p>Easier on the eyes at night.</p>
            </div>
            <Switch label="Dark mode" checked={account.theme === 'dark'} onChange={(v) => accountStore.setTheme(v ? 'dark' : 'light')} />
          </div>
          <div className="setting">
            <div>
              <h4>Alert sound</h4>
              <p>Play a chime in this browser when a fall or SOS arrives.</p>
            </div>
            <Switch label="Alert sound" checked={account.sound} onChange={(v) => accountStore.setSound(v)} />
          </div>
          <Link to="/app/contacts" className="setting" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div>
              <h4>Emergency contacts</h4>
              <p>
                {account.contacts.length} {account.contacts.length === 1 ? 'contact' : 'contacts'}. {account.contacts[0] ? `${account.contacts[0].name} is notified first.` : 'Add one so someone is notified.'}
              </p>
            </div>
            <ChevronRight size={20} aria-hidden="true" />
          </Link>
        </section>

        <section className="card" aria-labelledby="set-device">
          <h3 className="card-title" id="set-device" style={{ marginBottom: 18 }}>
            Device connection
          </h3>
          <div className="setting">
            <div>
              <h4>{device.name}</h4>
              <p>
                {device.id}, worn by {device.wearer}. {transport === 'mock' ? 'Using the built-in simulated band.' : 'Receiving live data over WebSocket.'}
              </p>
            </div>
          </div>
          {transport === 'mock' && (
            <>
              <div className="setting">
                <div>
                  <h4>Demo controls</h4>
                  <p>Show the panel that simulates falls, SOS presses, low battery and going offline.</p>
                </div>
                <Switch label="Demo controls" checked={account.demoMode} onChange={(v) => accountStore.setDemoMode(v)} />
              </div>
              <div className="setting">
                <div>
                  <h4>Reset demo data</h4>
                  <p>Clear simulated events and start again from a clean history.</p>
                </div>
                <button className="btn btn-sm" onClick={() => hardwareService.resetHistory()}>
                  <RotateCcw size={15} aria-hidden="true" /> Reset
                </button>
              </div>
            </>
          )}
        </section>

        <div>
          <button
            className="btn btn-lg"
            onClick={() => {
              accountStore.signOut();
              navigate('/login');
            }}
          >
            <LogOut size={18} aria-hidden="true" /> Sign out
          </button>
        </div>
      </div>
    </>
  );
}
