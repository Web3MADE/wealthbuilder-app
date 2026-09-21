import { z } from 'zod';
import type { Hex } from 'viem';

const schema = z.object({
  rpcUrl: z.string().url(),
  ownerPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
  agentPrivateKey: z.string().regex(/^0x[0-9a-fA-F]{64}$/),
});

export type ZeroDevServerConfig = Readonly<{
  rpcUrl: string;
  ownerPrivateKey: Hex;
  agentPrivateKey: Hex;
}>;

/** Development-only credentials for a Fuji Kernel account and delegated agent. */
export function zeroDevServerConfig(source = process.env): ZeroDevServerConfig | null {
  if (source.NODE_ENV !== 'development') return null;
  const parsed = schema.safeParse({
    rpcUrl: source.ZERODEV_RPC ?? source.ZERO_DEV_RPC,
    ownerPrivateKey: source.ZERODEV_OWNER_PRIVATE_KEY,
    agentPrivateKey: source.ZERODEV_AGENT_PRIVATE_KEY,
  });
  if (!parsed.success) return null;
  return {
    rpcUrl: parsed.data.rpcUrl,
    ownerPrivateKey: parsed.data.ownerPrivateKey as Hex,
    agentPrivateKey: parsed.data.agentPrivateKey as Hex,
  };
}
