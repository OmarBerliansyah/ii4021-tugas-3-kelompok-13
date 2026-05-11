import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

interface Contact {
  email: string;
  id?: string;
}

interface ContactListProps {
  activeContact: string | null;
  onSelectContact: (email: string) => void;
}

export const ContactList = ({ activeContact, onSelectContact }: ContactListProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    apiFetch<{ contacts: Contact[] }>('/users/contacts')
      .then(({ contacts }) => setContacts(contacts))
      .catch(() => setContacts([]))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = contacts.filter((c) =>
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <input
          type="text"
          placeholder="Search contacts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            background: 'var(--bg)',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {isLoading && (
          <p style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '14px', textAlign: 'center' }}>
            Loading contacts...
          </p>
        )}

        {!isLoading && filtered.length === 0 && (
          <p style={{ padding: '16px', color: 'var(--text-sub)', fontSize: '14px', textAlign: 'center' }}>
            No contacts found.
          </p>
        )}

        {filtered.map((contact) => {
          const isActive = contact.email === activeContact;
          const initial = contact.email[0].toUpperCase();

          return (
            <button
              key={contact.email}
              onClick={() => onSelectContact(contact.email)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                border: 'none',
                borderBottom: '1px solid var(--border)',
                background: isActive ? '#f0fdf4' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.15s',
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '15px',
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: isActive ? 600 : 400,
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {contact.email}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};