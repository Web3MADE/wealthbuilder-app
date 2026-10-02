import type {
  PlanSubmissionCompletion,
  PlanSubmissionRepositoryPort,
  PlanSubmissionStart,
} from './interfaces/plan-submission-repository';

export class PlanSubmissionService {
  constructor(private readonly repository: PlanSubmissionRepositoryPort) {}

  async start(input: Omit<PlanSubmissionStart, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await this.repository.create({ ...input, id });
    return id;
  }

  complete(id: string, input: PlanSubmissionCompletion): Promise<void> {
    return this.repository.complete(id, input);
  }

  fail(id: string, error: string): Promise<void> {
    return this.repository.fail(id, error);
  }
}
