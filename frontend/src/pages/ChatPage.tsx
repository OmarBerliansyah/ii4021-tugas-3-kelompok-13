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

  const { messages, isSecuring, isSessionReady, error, sendMessage } = useSecureChat(currentUser.email, selectedContact);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <div className="chat-sidebar-header">
          <div>
            <h1 className="chat-sidebar-title">Kelompok 13</h1>
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
            <p className="chat-empty-title">Pilih kontak</p>
            <p className="chat-empty-subtitle">Sesi terenkripsi dimulai ketika Anda membuka chat.</p>
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
                  {isSecuring ? 'Mempersiapkan sesi terenkripsi...' : isSessionReady ? 'Sesi terenkripsi siap' : 'Sesi terenkripsi tidak siap'}
                </p>
              </div>
              <div className="chat-header-badge">
                <ShieldIcon className="chat-header-badge-icon" />
                E2EE · X25519
              </div>
            </div>

            <div className="chat-messages">
              {error && (
                <div className="chat-error">
                  {error}
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={msg.sender_email === currentUser.email}
                />
              ))}

              {!isSecuring && messages.length === 0 && (
                <div
                  style={{
                    margin: '8px auto',
                    maxWidth: '420px',
                    textAlign: 'center',
                    border: '1px dashed var(--border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: 'var(--text-sub)',
                    fontSize: '13px',
                    lineHeight: 1.45,
                    background: '#fff',
                  }}
                >
                  Belum ada pesan pada percakapan ini.
                  <br />
                  Kamu bisa kirim pesan dulu, atau tunggu lawan login untuk melanjutkan chat real-time.
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <MessageComposer onSend={sendMessage} disabled={isSecuring || !isSessionReady} />

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