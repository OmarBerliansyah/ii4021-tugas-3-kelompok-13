import { useRef, useEffect, useState } from 'react';
import { useSecureChat } from '../hooks/useSecureChat';
import { ContactList } from '../components/ContactList';
import { ShieldIcon } from '../components/ShieldIcon';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { useAuth } from '../contexts/AuthContext';
import type { UserSession } from '../types/auth';
import '../styles/ChatPage.css';

interface ChatPageProps {
  currentUser: UserSession;
}

export const ChatPage = ({ currentUser }: ChatPageProps) => {
  const { logout } = useAuth();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isSecuring, error, sendMessage } = useSecureChat(
    currentUser.email,
    selectedContact
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div>
            <h1 className="chat-sidebar-title">CRYPTALK</h1>
            <p className="chat-sidebar-email">{currentUser.email}</p>
          </div>
          <button onClick={logout} className="chat-logout-btn">
            Logout
          </button>
        </div>
        <ContactList onSelectContact={setSelectedContact} activeContact={selectedContact} />
      </div>

      <div className="chat-main">
        {!selectedContact ? (
          <div className="chat-empty-state">
            <ShieldIcon className="chat-empty-icon" />
            <p className="chat-empty-title">Select a contact</p>
            <p className="chat-empty-subtitle">Secure session starts when you open a chat.</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <div className="chat-header-avatar">
                {selectedContact[0].toUpperCase()}
              </div>
              <div className="chat-header-info">
                <p className="chat-header-name">{selectedContact}</p>
                <p className={`chat-header-status ${isSecuring ? 'chat-header-status--securing' : 'chat-header-status--ready'}`}>
                  {isSecuring ? 'Preparing secure session...' : 'Secure session ready'}
                </p>
              </div>
              <div className="chat-header-badge">
                <ShieldIcon className="chat-header-badge-icon" />
                E2EE · X25519
              </div>
            </div>

            <div className="chat-messages">
              {error && <div className="chat-error">{error}</div>}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={msg.sender_email === currentUser.email}
                />
              ))}

              <div ref={messagesEndRef} />
            </div>

            <MessageComposer onSend={sendMessage} disabled={isSecuring || !!error} />

            {isSecuring && (
              <div className="chat-securing-overlay">
                <div className="chat-securing-card">
                  <div className="chat-securing-spinner" />
                  <p className="chat-securing-title">Deriving...</p>
                  <p className="chat-securing-subtitle">
                    Fetching public key, running X25519 ECDH,<br />
                    deriving AES-256 + HMAC session keys
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};