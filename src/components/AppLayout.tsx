import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Bell, Contact, Cpu, House, LayoutDashboard, MapPin, Settings, TriangleAlert, User } from 'lucide-react';
import { getActiveAlert, hardwareService, safetyOf, useHardware } from '../services/hardwareService';
import { useAccount } from '../store/accountStore';
import { greeting } from '../lib/format';
import { useNow } from '../hooks/useNow';
import { DevicePill, Logo, ThemeToggle } from './ui';
import { Toasts } from './Toasts';
import { EventModal } from './EventModal';

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/events', label: 'Live Events', icon: Bell },
  { to: '/app/falls', label: 'Fall Events', icon: TriangleAlert, badge: true },
  { to: '/app/device', label: 'Device', icon: Cpu },
  { to: '/app/location', label: 'Location', icon: MapPin },
  { to: '/app/contacts', label: 'Contacts', icon: Contact },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

const MOBILE_NAV = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/falls', label: 'Events', icon: Bell, badge: true },
  { to: '/app/device', label: 'Device', icon: Cpu },
  { to: '/app/settings', label: 'Profile', icon: User },
];

function Sidebar({ alertOpen }: { alertOpen: boolean }) {
  const { device } = useHardware();
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Link to="/app" aria-label="SENTRA dashboard">
        <Logo />
      </Link>
      <nav className="nav">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={19} aria-hidden="true" />
            {label}
            {badge && alertOpen && (
              <span className="badge" aria-label="1 active alert">
                1
              </span>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="side-device">
        <DevicePill status={device.connectionStatus} />
        <strong>{device.name}</strong>
        <span className="muted" style={{ fontSize: 13 }}>
          Worn by {device.wearer}
        </span>
      </div>
    </aside>
  );
}

function Topbar() {
  const { user } = useAccount();
  const { device } = useHardware();
  const now = useNow(1000);
  const navigate = useNavigate();
  const d = new Date(now);
  const first = user?.name.trim().split(' ')[0] ?? '';
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>
          {greeting(d)}{first ? `, ${first}` : ''} <span aria-hidden="true">👋</span>
        </h1>
        <p>SENTRA Control Center</p>
      </div>
      <div className="topbar-right">
        <DevicePill status={device.connectionStatus} />
        <time className="clock num" dateTime={d.toISOString()}>
          {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
        </time>
        <ThemeToggle />
        <button className="avatar" onClick={() => navigate('/app/settings')} aria-label="Open profile and settings">
          {first ? first.slice(0, 1).toUpperCase() : <User size={19} />}
        </button>
      </div>
    </header>
  );
}

/** Announces safety changes to screen readers, once per change. */
function SafetyAnnouncer() {
  useHardware();
  const alert = getActiveAlert();
  const safety = safetyOf(alert);
  const [msg, setMsg] = useState('');
  const prev = useRef(safety);
  useEffect(() => {
    if (prev.current === safety) return;
    prev.current = safety;
    setMsg(
      safety === 'clear'
        ? 'All clear. No emergency events.'
        : safety === 'possible_fall'
          ? 'Alert: possible fall detected.'
          : alert?.type === 'SOS_TRIGGERED'
            ? 'Emergency: SOS activated.'
            : 'Emergency: fall confirmed, emergency contact notified.',
    );
  }, [safety, alert?.type]);
  return (
    <div className="sr-only" role="alert" aria-live="assertive">
      {msg}
    </div>
  );
}

export function AppLayout() {
  const account = useAccount();
  const hw = useHardware();
  const ready = account.signedIn && account.setupComplete;

  useEffect(() => {
    if (!ready) return;
    hardwareService.start();
    return () => hardwareService.stop();
  }, [ready]);

  if (!account.signedIn) return <Navigate to="/login" replace />;
  if (!account.setupComplete) return <Navigate to="/setup" replace />;

  const alertOpen = safetyOf(hw.events.find((e) => e.id === hw.activeAlertId) ?? null) !== 'clear';

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Sidebar alertOpen={alertOpen} />
      <div className="content">
        <Topbar />
        <main id="main" className="page" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Main navigation">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon size={21} aria-hidden="true" />
            {label}
            {badge && alertOpen && <span className="badge" aria-label="Active alert" />}
          </NavLink>
        ))}
      </nav>
      <Toasts />
      <EventModal />
      <SafetyAnnouncer />
    </div>
  );
}
