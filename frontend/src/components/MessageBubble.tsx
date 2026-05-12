interface MessageBubbleProps {
  msg: {
    id: string;
    sender_email: string;
    timestamp: string;
    text?: string;
    isLocked?: boolean;
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

  if (msg.isLocked) {
    return (
      <div className={`message-row ${isMe ? 'message-row--me' : ''}`}>
        <div className="message-bubble message-bubble--locked">
          <p>{msg.text}</p>
          <span>{time} · Terkunci</span>
        </div>
      </div>
    );
  }

  if (msg.isInvalid) {
    return (
      <div className={`message-row ${isMe ? 'message-row--me' : ''}`}>
        <div className="message-bubble message-bubble--failed">
          <p>Integrity check failed</p>
          <span>{time} · MAC invalid</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`message-row ${isMe ? 'message-row--me' : ''}`}>
      <div className={`message-bubble ${isMe ? 'message-bubble--outgoing' : 'message-bubble--incoming'}`}>
        <p>{msg.text}</p>
        <span>{time} · encrypted</span>
      </div>
    </div>
  );
};
