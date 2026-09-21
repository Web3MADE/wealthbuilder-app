export type DevActivityKind =
  'POLICY_UPDATED' | 'ACTION_APPROVED' | 'ACTION_BLOCKED' | 'SUPPLY_CONFIRMED' | 'EXECUTION_FAILED';

export type DevActivity = Readonly<{
  id: string;
  kind: DevActivityKind;
  title: string;
  description: string;
  status: 'allowed' | 'blocked' | 'completed' | 'failed';
  occurredAt: string;
  amount?: string;
  details?: Readonly<{
    reference?: string;
    network?: string;
    account?: string;
    executionStatus?: string;
  }>;
}>;

/** Process-local product activity for the development session. */
export class DevActivityStore {
  private items: DevActivity[] = [];

  record(item: Omit<DevActivity, 'id' | 'occurredAt'>) {
    const activity: DevActivity = {
      id: crypto.randomUUID(),
      occurredAt: new Date().toISOString(),
      ...item,
    };
    this.items.unshift(activity);
    this.items = this.items.slice(0, 50);
    return activity;
  }

  list() {
    return [...this.items];
  }
}

const storeKey = Symbol.for('wealthbuilder.devActivityStore');

export function devActivityStore(): DevActivityStore {
  const runtime = globalThis as typeof globalThis & { [storeKey]?: DevActivityStore };
  return (runtime[storeKey] ??= new DevActivityStore());
}
