import { z } from 'zod';
import type { Hex } from 'viem';
import type { JawExecutorConfig } from './jaw-smart-account-executor';

const schema = z.object({
  apiKey: z.string().min(1),
  delegatedPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  rpcUrl: z.string().url().optional(),
});

/** Server-only JAW configuration. The delegated signer never reaches the browser. */
export function jawServerConfig(source = process.env): JawExecutorConfig | null {
  const parsed = schema.safeParse({
    apiKey: source.JAW_API_KEY ?? source.NEXT_PUBLIC_JAW_API_KEY,
    delegatedPrivateKey: source.JAW_DELEGATE_PRIVATE_KEY,
    rpcUrl: source.FUJI_RPC_URL,
  });
  if (!parsed.success) return null;
  return {
    apiKey: parsed.data.apiKey,
    delegatedPrivateKey: parsed.data.delegatedPrivateKey as Hex,
    ...(parsed.data.rpcUrl ? { rpcUrl: parsed.data.rpcUrl } : {}),
  };
}

const headlessSchema = schema.extend({
  devHeadless: z.literal('true'),
  devPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export type JawHeadlessConfig = JawExecutorConfig & Readonly<{ devPrivateKey: Hex }>;

/** Development-only root authority. Production stays passkey based. */
export function jawHeadlessConfig(source = process.env): JawHeadlessConfig | null {
  if (source.NODE_ENV !== 'development') return null;
  const parsed = headlessSchema.safeParse({
    apiKey: source.JAW_API_KEY ?? source.NEXT_PUBLIC_JAW_API_KEY,
    delegatedPrivateKey: source.JAW_DELEGATE_PRIVATE_KEY,
    rpcUrl: source.FUJI_RPC_URL,
    devHeadless: source.JAW_DEV_HEADLESS,
    devPrivateKey: source.JAW_DEV_PRIVATE_KEY,
  });
  if (!parsed.success) return null;
  return {
    apiKey: parsed.data.apiKey,
    delegatedPrivateKey: parsed.data.delegatedPrivateKey as Hex,
    devPrivateKey: parsed.data.devPrivateKey as Hex,
    ...(parsed.data.rpcUrl ? { rpcUrl: parsed.data.rpcUrl } : {}),
  };
}
