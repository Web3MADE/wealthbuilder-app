'use client';

import { useState, type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';

export function HomeChatBar({ id, mobile = false }: { id: string; mobile?: boolean }) {
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim()) setSubmitted(true);
  }

  return (
    <div
      className={mobile ? 'home-chat-wrap home-chat-mobile' : 'home-chat-wrap home-chat-desktop'}
    >
      <form className="home-chat-bar" onSubmit={submit}>
        <span className="home-chat-spark">
          <Sparkles size={22} />
        </span>
        <label className="sr-only" htmlFor={id}>
          Ask WealthBuilder anything
        </label>
        <input
          id={id}
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
            setSubmitted(false);
          }}
          placeholder="Ask WealthBuilder anything..."
        />
        <button type="submit" aria-label="Send message">
          <Send size={21} />
        </button>
      </form>
      {submitted && (
        <p className="home-chat-note" role="status">
          AI chat is coming soon.
        </p>
      )}
    </div>
  );
}
