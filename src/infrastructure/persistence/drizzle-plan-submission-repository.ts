import { eq } from 'drizzle-orm';
import type {
  PlanSubmissionCompletion,
  PlanSubmissionRepositoryPort,
  PlanSubmissionStart,
} from '@/application/interfaces/plan-submission-repository';
import type { Database } from './postgres';
import { planSubmissions } from './schema';

export class DrizzlePlanSubmissionRepository implements PlanSubmissionRepositoryPort {
  constructor(private readonly db: Database) {}

  async create(input: PlanSubmissionStart): Promise<void> {
    await this.db.insert(planSubmissions).values({
      ...input,
      status: 'submitted',
    });
  }

  async complete(id: string, input: PlanSubmissionCompletion): Promise<void> {
    await this.db
      .update(planSubmissions)
      .set({ ...input, status: 'completed', updatedAt: new Date(), error: null })
      .where(eq(planSubmissions.id, id));
  }

  async fail(id: string, error: string): Promise<void> {
    await this.db
      .update(planSubmissions)
      .set({ status: 'failed', error, updatedAt: new Date() })
      .where(eq(planSubmissions.id, id));
  }
}
