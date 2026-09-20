import type { UserIdentityPort } from '@/application/interfaces/auth';
import { users } from './schema';
import type { Database } from './postgres';

export class DrizzleUserRepository implements UserIdentityPort {
  constructor(private readonly db: Database) {}

  async ensure(walletAddress: string): Promise<void> {
    await this.db
      .insert(users)
      .values({ walletAddress: walletAddress.toLowerCase() })
      .onConflictDoNothing();
  }
}
