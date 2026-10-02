import { ChatAccountProvider } from '@/bootstrap-client';
import { ChatScreen } from '@/presentation/chat/ChatScreen';

export default function ChatPage() {
  return (
    <ChatAccountProvider>
      <ChatScreen />
    </ChatAccountProvider>
  );
}
