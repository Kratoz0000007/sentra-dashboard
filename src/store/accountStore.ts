import { useSyncExternalStore } from 'react';
import type { EmergencyContact, User } from '../types';
import { load, save, uid } from '../lib/storage';

export interface DeviceConfig {
  id: string;
  name: string;
  wearer: string;
}

export type Theme = 'light' | 'dark';

export interface AccountState {
  user: User | null;
  signedIn: boolean;
  setupComplete: boolean;
  device: DeviceConfig | null;
  contacts: EmergencyContact[];
  demoMode: boolean;
  sound: boolean;
  theme: Theme;
}

const KEY = 'sentra.account';

const DEMO_DEVICE: DeviceConfig = { id: 'SENTRA-001', name: 'SENTRA Band', wearer: 'Grandma' };

function demoContacts(userId: string): EmergencyContact[] {
  return [
    { id: uid('ct'), userId, name: 'Karthik Raman', relationship: 'Neighbour', phone: '+91 94440 65432' },
  ];
}

function initialTheme(): Theme {
  const stored = load<Theme | null>('sentra.theme', null);
  if (stored) return stored;
  try {
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

let state: AccountState = load<AccountState>(KEY, {
  user: null,
  signedIn: false,
  setupComplete: false,
  device: null,
  contacts: [],
  demoMode: true,
  sound: true,
  theme: initialTheme(),
});
state = { ...state, sound: state.sound ?? true, theme: initialTheme() };
document.documentElement.dataset.theme = state.theme;

const listeners = new Set<() => void>();

function set(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  save(KEY, state);
  listeners.forEach((l) => l());
}

export const accountStore = {
  get: () => state,
  subscribe(l: () => void) {
    listeners.add(l);
    return () => void listeners.delete(l);
  },

  /** Mock sign-in. Swap for your auth provider; the rest of the app only reads `user`. */
  signIn(email: string) {
    if (state.user && state.user.email.toLowerCase() === email.toLowerCase()) {
      set({ signedIn: true });
      return;
    }
    // Unknown email: open the ready-made demo account so the dashboard can be shown immediately.
    const user: User = { id: uid('usr'), name: '', email, phone: '', createdAt: Date.now() };
    set({ user, signedIn: true, setupComplete: true, device: DEMO_DEVICE, contacts: demoContacts(user.id) });
  },

  signUp(data: { name: string; email: string; phone: string }) {
    const user: User = { id: uid('usr'), ...data, createdAt: Date.now() };
    set({ user, signedIn: true, setupComplete: false, device: null, contacts: [] });
  },

  signOut() {
    set({ signedIn: false });
  },

  completeSetup(device: DeviceConfig, contact: Omit<EmergencyContact, 'id' | 'userId'> | null) {
    const userId = state.user?.id ?? 'anon';
    const contacts = contact ? [{ ...contact, id: uid('ct'), userId }, ...state.contacts] : state.contacts;
    set({ device, contacts, setupComplete: true });
  },

  addContact(c: Omit<EmergencyContact, 'id' | 'userId'>) {
    set({ contacts: [...state.contacts, { ...c, id: uid('ct'), userId: state.user?.id ?? 'anon' }] });
  },

  updateContact(id: string, c: Omit<EmergencyContact, 'id' | 'userId'>) {
    set({ contacts: state.contacts.map((x) => (x.id === id ? { ...x, ...c } : x)) });
  },

  removeContact(id: string) {
    set({ contacts: state.contacts.filter((x) => x.id !== id) });
  },

  setDemoMode(demoMode: boolean) {
    set({ demoMode });
  },

  setSound(sound: boolean) {
    set({ sound });
  },

  setTheme(theme: Theme) {
    save('sentra.theme', theme);
    document.documentElement.dataset.theme = theme;
    set({ theme });
  },
};

export function useAccount() {
  return useSyncExternalStore(accountStore.subscribe, accountStore.get);
}
