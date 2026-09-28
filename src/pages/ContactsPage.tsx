import { useState, type FormEvent } from 'react';
import { Pencil, Phone, Plus, Trash2, UserRound } from 'lucide-react';
import { accountStore, useAccount } from '../store/accountStore';
import { EmptyState } from '../components/ui';
import type { EmergencyContact } from '../types';

type Draft = Omit<EmergencyContact, 'id' | 'userId'>;
const EMPTY: Draft = { name: '', relationship: '', phone: '' };

export function ContactForm({ initial = EMPTY, submitLabel, onSubmit, onCancel }: { initial?: Draft; submitLabel: string; onSubmit: (d: Draft) => void; onCancel?: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [touched, setTouched] = useState(false);
  const phoneOk = /^\+?[\d\s-]{7,}$/.test(d.phone.trim());
  const valid = d.name.trim() && d.relationship.trim() && phoneOk;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onSubmit({ name: d.name.trim(), relationship: d.relationship.trim(), phone: d.phone.trim() });
  }

  return (
    <form className="form" onSubmit={submit} noValidate>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="c-name">Name</label>
          <input id="c-name" className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} aria-invalid={touched && !d.name.trim()} autoComplete="name" />
          {touched && !d.name.trim() && <span className="error">Enter the contact's name.</span>}
        </div>
        <div className="field">
          <label htmlFor="c-rel">Relationship</label>
          <input id="c-rel" className="input" placeholder="Daughter, neighbour…" value={d.relationship} onChange={(e) => setD({ ...d, relationship: e.target.value })} aria-invalid={touched && !d.relationship.trim()} />
          {touched && !d.relationship.trim() && <span className="error">Enter how they're related.</span>}
        </div>
      </div>
      <div className="field">
        <label htmlFor="c-phone">Phone</label>
        <input id="c-phone" className="input" type="tel" placeholder="+91 98765 43210" value={d.phone} onChange={(e) => setD({ ...d, phone: e.target.value })} aria-invalid={touched && !phoneOk} autoComplete="tel" />
        {touched && !phoneOk && <span className="error">Enter a phone number with at least 7 digits.</span>}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-lg" type="submit">
          {submitLabel}
        </button>
        {onCancel && (
          <button className="btn btn-lg btn-ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function ContactsPage() {
  const { contacts } = useAccount();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <div className="page-head">
        <div>
          <h2>Emergency contacts</h2>
          <p>The first contact is notified automatically when a fall isn't resolved in time or the SOS button is pressed.</p>
        </div>
        {!adding && (
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={18} aria-hidden="true" /> Add contact
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 14, maxWidth: 860 }}>
        {adding && (
          <section className="card" aria-label="New contact">
            <h3 className="card-title" style={{ marginBottom: 16 }}>
              New emergency contact
            </h3>
            <ContactForm
              submitLabel="Save contact"
              onSubmit={(d) => {
                accountStore.addContact(d);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          </section>
        )}

        {contacts.length === 0 && !adding && (
          <div className="card">
            <EmptyState
              icon={<UserRound size={26} />}
              title="No emergency contacts"
              body="Add someone SENTRA should notify when a fall or SOS happens."
              action={
                <button className="btn btn-primary" onClick={() => setAdding(true)} style={{ marginTop: 8 }}>
                  <Plus size={18} aria-hidden="true" /> Add contact
                </button>
              }
            />
          </div>
        )}

        {contacts.map((c, i) =>
          editing === c.id ? (
            <section key={c.id} className="card" aria-label={`Edit ${c.name}`}>
              <ContactForm
                initial={{ name: c.name, relationship: c.relationship, phone: c.phone }}
                submitLabel="Save changes"
                onSubmit={(d) => {
                  accountStore.updateContact(c.id, d);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </section>
          ) : (
            <article key={c.id} className="card contact">
              <div className="contact-avatar" aria-hidden="true">
                {c.name.slice(0, 1).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <h3>
                  {c.name}
                  {i === 0 && <span className="pill accent">Notified first</span>}
                </h3>
                <p className="muted">
                  {c.relationship}, <span className="num">{c.phone}</span>
                </p>
              </div>
              <div className="contact-actions">
                <a className="btn btn-sm btn-primary" href={`tel:${c.phone.replace(/\s/g, '')}`} aria-label={`Call ${c.name}`}>
                  <Phone size={15} aria-hidden="true" /> Call
                </a>
                <button className="btn btn-sm" onClick={() => setEditing(c.id)} aria-label={`Edit ${c.name}`}>
                  <Pencil size={15} aria-hidden="true" /> Edit
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    if (window.confirm(`Remove ${c.name} from emergency contacts?`)) accountStore.removeContact(c.id);
                  }}
                  aria-label={`Remove ${c.name}`}
                >
                  <Trash2 size={15} aria-hidden="true" /> Remove
                </button>
              </div>
            </article>
          ),
        )}
      </div>
    </>
  );
}
