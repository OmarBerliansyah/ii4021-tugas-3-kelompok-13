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
    <div className="contact-list">
      <div className="contact-list__search">
        <input
          type="text"
          placeholder="Search contacts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search contacts"
        />
      </div>

      <div className="contact-list__body">
        {isLoading && (
          <p className="contact-list__empty">
            Loading contacts...
          </p>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="contact-list__empty">
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
              className={`contact-cell ${isActive ? 'contact-cell--active' : ''}`}
            >
              <div className="contact-cell__avatar">
                {initial}
              </div>
              <span className="contact-cell__main">
                <span className="contact-cell__email">{contact.email}</span>
                <span className="contact-cell__preview">Secure session starts on open</span>
              </span>
              <span className="security-chip security-chip--ready">Secure</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
