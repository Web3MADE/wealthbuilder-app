import {
  bigint,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  walletAddress: text('wallet_address').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const policies = pgTable(
  'policies',
  {
    walletAddress: text('wallet_address')
      .notNull()
      .references(() => users.walletAddress),
    version: integer('version').notNull(),
    id: text('id').notNull(),
    chainId: text('chain_id').notNull(),
    allowedAssetIds: jsonb('allowed_asset_ids').$type<string[]>().notNull(),
    excludedAssetIds: jsonb('excluded_asset_ids').$type<string[]>().notNull(),
    allowedProtocolIds: jsonb('allowed_protocol_ids').$type<string[]>().notNull(),
    maxSingleTransactionMicros: bigint('max_single_transaction_micros', {
      mode: 'bigint',
    }).notNull(),
    maxAutonomousTransactionMicros: bigint('max_autonomous_transaction_micros', {
      mode: 'bigint',
    }).notNull(),
    autonomyEnabled: boolean('autonomy_enabled').notNull(),
    maxAssetConcentrationBps: integer('max_asset_concentration_bps').notNull(),
    minimumLiquidStableReserveBps: integer('minimum_liquid_stable_reserve_bps').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.walletAddress, table.chainId, table.version] })],
);
