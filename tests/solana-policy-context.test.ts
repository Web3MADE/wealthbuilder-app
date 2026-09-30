import { describe, expect, it } from 'vitest';
import {
  defaultSolanaPolicySettings,
  SolanaPolicyContext,
  solanaNativePolicyScope,
  validateSolanaPolicySettings,
} from '../src/infrastructure/solana/solana-policy-context';

describe('Solana policy context', () => {
  it.each([
    ['devnet', 'solana-devnet'],
    ['localnet', 'solana-localnet'],
  ] as const)('maps %s to the %s policy chain', (cluster, chainId) => {
    const context = new SolanaPolicyContext(cluster);

    expect(context.chain).toEqual({ id: chainId });
    expect(context.supportedAssetIds).toEqual(['sol']);
    expect(validateSolanaPolicySettings(defaultSolanaPolicySettings)).toEqual({});
  });

  it('accepts SOL only and rejects unsupported asset or scope settings', () => {
    expect(
      validateSolanaPolicySettings({
        ...defaultSolanaPolicySettings,
        allowedAssetIds: ['sol', 'usdc'],
      }),
    ).toMatchObject({ allowedAssetIds: 'SOL is the only supported Solana asset.' });
    expect(
      validateSolanaPolicySettings({
        ...defaultSolanaPolicySettings,
        allowedProtocolIds: ['jupiter'],
      }),
    ).toMatchObject({
      allowedProtocolIds: 'Solana policy currently supports native SOL custody only.',
    });
    expect(solanaNativePolicyScope).toBe('solana-native');
  });
});
