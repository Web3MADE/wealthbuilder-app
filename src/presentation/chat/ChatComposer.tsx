import type { FormEvent } from 'react';
import { ArrowUp, Paperclip } from 'lucide-react';
import type { ChatModel, ChatState } from './chat-types';

export function ChatComposer({
  input,
  model,
  models,
  state,
  loading,
  onInputChange,
  onModelChange,
  onAttach,
  onSubmit,
}: {
  input: string;
  model: string;
  models: readonly ChatModel[];
  state: ChatState;
  loading: boolean;
  onInputChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onAttach: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const primaryPlaceholder = state === 'empty' || state === 'attach' || state === 'menu' || loading;

  return (
    <div className="chat-composer-wrap">
      <form className="chat-composer" onSubmit={onSubmit}>
        <button
          type="button"
          className="chat-attach"
          aria-label="Attach context"
          onClick={onAttach}
        >
          <Paperclip />
        </button>
        <label className="sr-only" htmlFor="chat-input">
          Ask WealthBuilder anything
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(event) => onInputChange(event.target.value)}
          placeholder={primaryPlaceholder ? 'Ask WealthBuilder anything…' : 'Ask a follow up…'}
          disabled={loading}
        />
        <label className="chat-model-picker" htmlFor="chat-model">
          <span className="sr-only">Model</span>
          <select
            id="chat-model"
            aria-label="AI model"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
            disabled={!models.length || loading}
          >
            {models.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="chat-send"
          aria-label="Send message"
          disabled={loading || !input.trim()}
        >
          <ArrowUp />
        </button>
      </form>
      <p>I can make mistakes. Always review important actions.</p>
    </div>
  );
}
