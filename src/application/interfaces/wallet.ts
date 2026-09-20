export type WalletConnection = Readonly<{
  address: string | null;
  chainId: number | null;
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  switchToFuji(): Promise<void>;
  sign(message: string): Promise<`0x${string}`>;
}>;
