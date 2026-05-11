interface MessageBubbleProps {
  msg: {
    id: string;
    sender_email: string;
    timestamp: string;
    text?: string;
    isInvalid?: boolean;
  };
  isMe: boolean;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const MessageBubble = ({ msg, isMe }: MessageBubbleProps) => {
  const time = formatTime(msg.timestamp);

  if (msg.isInvalid) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: isMe ? 'flex-end' : 'flex-start',
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: '10px 14px',
            borderRadius: '12px',
            background: '#fff1f1',
            border: '1px solid #fecaca',
          }}
        >
          <p style={{ margin: 0, fontSize: '14px', color: '#dc2626' }}>
             Integritas pesan gagal — pesan tidak dapat didekripsi.
          </p>
          <span style={{ fontSize: '11px', color: '#ef4444', display: 'block', marginTop: '4px' }}>
            {time} · MAC invalid
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '10px 14px',
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMe ? 'var(--accent)' : '#ffffff',
          border: isMe ? 'none' : '1px solid var(--border)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: '1.5',
            color: isMe ? '#ffffff' : 'var(--text-primary)',
            wordBreak: 'break-word',
          }}
        >
          {msg.text}
        </p>
        <span
          style={{
            fontSize: '11px',
            display: 'block',
            marginTop: '4px',
            color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-sub)',
            textAlign: 'right',
          }}
        >
          {time}
        </span>
      </div>
    </div>
  );
};
