import {
  Activity,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Compass,
  Eye,
  Home,
  MessageCircle,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';

export type WealthIconName =
  | 'home'
  | 'portfolio'
  | 'strategy'
  | 'explore'
  | 'activity'
  | 'chat'
  | 'settings'
  | 'bell'
  | 'arrow'
  | 'spark'
  | 'send'
  | 'shield'
  | 'eye'
  | 'clock'
  | 'refresh'
  | 'check';

const icons: Record<WealthIconName, LucideIcon> = {
  home: Home,
  portfolio: WalletCards,
  strategy: ShieldCheck,
  explore: Compass,
  activity: Activity,
  chat: MessageCircle,
  settings: Settings,
  bell: Bell,
  arrow: ArrowRight,
  spark: Sparkles,
  send: Send,
  shield: ShieldCheck,
  eye: Eye,
  clock: Clock3,
  refresh: RefreshCw,
  check: CheckCircle2,
};

export function WealthIcon({ name, size = 19 }: { name: WealthIconName; size?: number }) {
  const Icon = icons[name];
  return <Icon size={size} aria-hidden="true" />;
}
