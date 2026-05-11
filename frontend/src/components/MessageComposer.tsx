import { useState, useRef } from 'react';

interface MessageComposerProps {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
}

export const MessageComposer = ({ onSend, disabled = false }: MessageComposerProps) => {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || isSending || disabled) return;

    setIsSending(true);
    setText('');
    try {
      await onSend(trimmed);
    } 
    catch {
      setText(trimmed);
    } 
    finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSending}
        placeholder={disabled ? 'Preparing secure session...' : 'Type an encrypted message'}
        style={{
          flex: 1,
          padding: '10px 14px',
          border: '1px solid var(--border)',
          borderRadius: '24px',
          fontSize: '14px',
          outline: 'none',
          background: disabled ? 'var(--bg)' : '#fff',
          color: 'var(--text-primary)',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
      />
      <button
        onClick={handleSend}
        disabled={disabled || isSending || !text.trim()}
        style={{
          padding: '10px 20px',
          borderRadius: '24px',
          border: 'none',
          background: disabled || !text.trim() ? 'var(--border)' : 'var(--accent)',
          color: disabled || !text.trim() ? 'var(--text-sub)' : '#fff',
          fontWeight: 600,
          fontSize: '14px',
          cursor: disabled || !text.trim() ? 'default' : 'pointer',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        {isSending ? '...' : 'Send'}
      </button>
    </div>
  );
};
