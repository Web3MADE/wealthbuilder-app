import type {
  IntakeSubmission,
  IntakeSubmissionRepositoryPort,
} from '@/application/interfaces/intake-submission-repository';
import type { Database } from './postgres';
import { intakeSubmissions } from './schema';

export class DrizzleIntakeSubmissionRepository implements IntakeSubmissionRepositoryPort {
  constructor(private readonly db: Database) {}

  async create(input: IntakeSubmission): Promise<void> {
    await this.db.insert(intakeSubmissions).values({ ...input, status: 'new' });
  }
}
