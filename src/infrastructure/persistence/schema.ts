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

export const planSubmissions = pgTable('plan_submissions', {
  id: text('id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  source: text('source').notNull(),
  walletAddress: text('wallet_address'),
  examplePreset: text('example_preset'),
  goal: text('goal').notNull(),
  timeHorizon: text('time_horizon').notNull(),
  dropBehavior: text('drop_behavior').notNull(),
  portfolioSnapshot: jsonb('portfolio_snapshot'),
  status: text('status').notNull(),
  strategy: text('strategy'),
  allocation: jsonb('allocation'),
  deterministicReasons: jsonb('deterministic_reasons'),
  ruledOut: jsonb('ruled_out'),
  aiExplanation: jsonb('ai_explanation'),
  error: text('error'),
});
