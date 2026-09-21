export function ConversationalResponse({ content }: { content: string }) {
  return (
    <div className="chat-conversation-bubble">
      {content.split(/\n{2,}/).map((paragraph, index) => (
        <p key={`${index}-${paragraph}`}>{paragraph}</p>
      ))}
    </div>
  );
}
