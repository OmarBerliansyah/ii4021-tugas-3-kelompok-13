import { useRef, useEffect, useState } from 'react';
import { useSecureChat } from '../hooks/useSecureChat';
import { ContactList } from '../components/ContactList';
import { ShieldIcon } from '../components/ShieldIcon';
import { MessageBubble } from '../components/MessageBubble';
import { MessageComposer } from '../components/MessageComposer';
import { CryptoLoadingModal } from '../components/CryptoLoadingModal';
import { useAuth } from '../contexts/AuthContext';
import type { UserSession } from '../types/auth';
import '../styles/ChatPage.css';

interface ChatPageProps {
  currentUser: UserSession;
}

export const ChatPage = ({ currentUser }: ChatPageProps) => {
  const { logout } = useAuth();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isSecuring, isSessionReady, requiresRelogin, error, sendMessage } = useSecureChat(
    currentUser.email,
    selectedContact,
  );
  const composerPlaceholder = isSecuring ? 'Preparing secure session...' : requiresRelogin ? 'Login ulang untuk membuka sesi dan mengirim pesan' : 'Secure session unavailable';

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
              <button
                type="button"
                className="chat-detail-btn"
                onClick={() => setIsDetailOpen(true)}
              >
                Details
              </button>
            </div>

            <div className="chat-messages">
              {error && (
                <div className="chat-error">
                  {error}
                  {requiresRelogin && (
                    <button
                      type="button"
                      onClick={logout}
                      className="chat-error__action"
                    >
                      Login ulang
                    </button>
                  )}
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
                <div className="chat-empty-hint">
                  Belum ada pesan pada percakapan ini.
                  <br />
                  Kamu bisa kirim pesan dulu, atau tunggu lawan login untuk melanjutkan chat real-time.
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <MessageComposer
              onSend={sendMessage}
              disabled={isSecuring || !isSessionReady}
              disabledPlaceholder={composerPlaceholder}
            />

            {isSecuring && (
              <CryptoLoadingModal
                headline="Deriving..."
                steps={[
                  'Fetching public key',
                  'Running X25519 ECDH',
                  'Deriving AES-256 session key',
                  'Preparing MAC verification',
                ]}
              />
            )}

            {isDetailOpen && (
              <div className="technical-drawer" role="dialog" aria-modal="true" aria-label="Technical details">
                <div className="technical-drawer__panel">
                  <div className="technical-drawer__header">
                    <div>
                      <p className="technical-drawer__eyebrow">Demo details</p>
                      <h2>Secure session</h2>
                    </div>
                    <button type="button" onClick={() => setIsDetailOpen(false)} aria-label="Close technical details">
                      Close
                    </button>
                  </div>
                  <dl className="technical-list">
                    <div>
                      <dt>Authentication</dt>
                      <dd>JWT verified · JWS signed by server</dd>
                    </div>
                    <div>
                      <dt>Key exchange</dt>
                      <dd>X25519 ECDH · shared key never leaves browser</dd>
                    </div>
                    <div>
                      <dt>KDF</dt>
                      <dd>HKDF-SHA-256 derives message keys locally</dd>
                    </div>
                    <div>
                      <dt>Message payload</dt>
                      <dd>Server stores ciphertext, IV, MAC, and timestamp only</dd>
                    </div>
                    <div>
                      <dt>Integrity</dt>
                      <dd>MAC is checked before plaintext display</dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
