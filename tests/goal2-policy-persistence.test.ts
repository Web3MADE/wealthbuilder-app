import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { usd, type PolicySettings } from '../src/domain';
import { PolicyService } from '../src/application/policy-service';
import { DrizzlePolicyRepository } from '../src/infrastructure/persistence/drizzle-policy-repository';
import type { Database } from '../src/infrastructure/persistence/postgres';
import {
  defaultSolanaPolicySettings,
  SolanaPolicyContext,
} from '../src/infrastructure/solana/solana-policy-context';

const chain = { id: 'avalanche-fuji' };
const alice = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const bob = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const solanaWallet = 'So11111111111111111111111111111111111111112';
const settings: PolicySettings = {
  allowedAssetIds: ['usdc', 'avax'],
  excludedAssetIds: ['doge'],
  allowedProtocolIds: ['aave-v3'],
  maxSingleTransactionValue: usd(1_000_000_000n),
  maxAssetConcentrationBps: 4_000,
  minimumLiquidStableReserveBps: 2_000,
  autonomy: { enabled: false, maxTransactionValue: usd(100_000_000n) },
};

describe('Drizzle policy repository', () => {
  let client: PGlite;
  let repository: DrizzlePolicyRepository;
  beforeAll(async () => {
    client = new PGlite();
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: './drizzle' });
    repository = new DrizzlePolicyRepository(db as unknown as Database);
  });
  afterAll(async () => {
    await client.close();
  });

  it('maps integer money and policy fields through Postgres', async () => {
    const saved = await repository.saveNext(alice, chain, settings);
    const loaded = await repository.getActive(alice, chain);
    expect(saved.version).toBe(1);
    expect(loaded).toEqual(saved);
    expect(loaded?.maxSingleTransactionValue.micros).toBe(1_000_000_000n);
  });

  it('increments versions for changes and retains the version for an unchanged save', async () => {
    const changed = await repository.saveNext(alice, chain, {
      ...settings,
      minimumLiquidStableReserveBps: 2_500,
    });
    expect(changed.version).toBe(2);
    const unchanged = await repository.saveNext(alice, chain, {
      ...settings,
      minimumLiquidStableReserveBps: 2_500,
    });
    expect(unchanged.version).toBe(2);
    expect((await repository.getActive(alice, chain))?.minimumLiquidStableReserveBps).toBe(2_500);
  });

  it('isolates policies by authenticated wallet', async () => {
    expect(await repository.getActive(bob, chain)).toBeNull();
    const saved = await repository.saveNext(bob, chain, settings);
    expect(saved.version).toBe(1);
    expect((await repository.getActive(alice, chain))?.version).toBe(2);
  });

  it('persists Solana policies independently for devnet and localnet', async () => {
    const service = new PolicyService(repository);
    const devnet = new SolanaPolicyContext('devnet');
    const localnet = new SolanaPolicyContext('localnet');

    const savedDevnet = await devnet.save(service, solanaWallet, defaultSolanaPolicySettings);
    const savedLocalnet = await localnet.save(service, solanaWallet, defaultSolanaPolicySettings);
    const changedDevnet = await devnet.save(service, solanaWallet, {
      ...defaultSolanaPolicySettings,
      maxAssetConcentrationBps: 8_000,
    });

    expect(savedDevnet.policy?.version).toBe(1);
    expect(savedLocalnet.policy?.version).toBe(1);
    expect(changedDevnet.policy?.version).toBe(2);
    expect((await devnet.load(service, solanaWallet))?.maxAssetConcentrationBps).toBe(8_000);
    expect((await localnet.load(service, solanaWallet))?.maxAssetConcentrationBps).toBe(10_000);
  });
});
