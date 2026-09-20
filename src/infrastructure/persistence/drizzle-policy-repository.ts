import { and, desc, eq, sql } from 'drizzle-orm';
import type { PolicyRepositoryPort } from '@/application/interfaces/repositories';
import type { ChainRef, PersonalWealthPolicy, PolicySettings } from '@/domain';
import { fromPolicy, toPolicy } from './policy-mapping';
import { policies, users } from './schema';
import type { Database } from './postgres';

export class DrizzlePolicyRepository implements PolicyRepositoryPort {
  constructor(private readonly db: Database) {}

  async getActive(walletId: string, chain: ChainRef): Promise<PersonalWealthPolicy | null> {
    const [row] = await this.db
      .select()
      .from(policies)
      .where(
        and(eq(policies.walletAddress, walletId.toLowerCase()), eq(policies.chainId, chain.id)),
      )
      .orderBy(desc(policies.version))
      .limit(1);
    return row ? toPolicy(row) : null;
  }

  async saveNext(
    walletId: string,
    chain: ChainRef,
    input: PolicySettings,
  ): Promise<PersonalWealthPolicy> {
    const normalizedWallet = walletId.toLowerCase();
    return this.db.transaction(async (tx) => {
      await tx.insert(users).values({ walletAddress: normalizedWallet }).onConflictDoNothing();
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${normalizedWallet}), hashtext(${chain.id}))`,
      );
      const [previous] = await tx
        .select()
        .from(policies)
        .where(and(eq(policies.walletAddress, normalizedWallet), eq(policies.chainId, chain.id)))
        .orderBy(desc(policies.version))
        .limit(1);
      if (previous && sameSettings(toPolicy(previous), input)) return toPolicy(previous);
      const next: PersonalWealthPolicy = {
        ...input,
        id: previous?.id ?? crypto.randomUUID(),
        version: (previous?.version ?? 0) + 1,
        walletId: normalizedWallet,
        chain,
        createdAt: new Date(),
      };
      await tx.insert(policies).values(fromPolicy(next));
      return next;
    });
  }
}

function sameSettings(current: PolicySettings, next: PolicySettings): boolean {
  const sameList = (a: readonly string[], b: readonly string[]) =>
    a.length === b.length && a.every((value, index) => value === b[index]);
  return (
    sameList(current.allowedAssetIds, next.allowedAssetIds) &&
    sameList(current.excludedAssetIds, next.excludedAssetIds) &&
    sameList(current.allowedProtocolIds, next.allowedProtocolIds) &&
    current.maxSingleTransactionValue.micros === next.maxSingleTransactionValue.micros &&
    current.autonomy.maxTransactionValue.micros === next.autonomy.maxTransactionValue.micros &&
    current.autonomy.enabled === next.autonomy.enabled &&
    current.maxAssetConcentrationBps === next.maxAssetConcentrationBps &&
    current.minimumLiquidStableReserveBps === next.minimumLiquidStableReserveBps
  );
}
