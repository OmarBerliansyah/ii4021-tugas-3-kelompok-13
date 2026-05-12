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
    } catch {
      setText(trimmed);
    } finally {
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
    <div className="message-composer">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isSending}
        placeholder={disabled ? 'Preparing secure session...' : 'Type an encrypted message'}
        aria-label="Encrypted message"
      />
      <button onClick={handleSend} disabled={disabled || isSending || !text.trim()}>
        {isSending ? 'Encrypting' : 'Send'}
      </button>
    </div>
  );
};
