import type {
  IntakeSubmission,
  IntakeSubmissionRepositoryPort,
} from './interfaces/intake-submission-repository';

export class IntakeSubmissionService {
  constructor(private readonly repository: IntakeSubmissionRepositoryPort) {}

  create(input: Omit<IntakeSubmission, 'id'>): Promise<void> {
    return this.repository.create({ ...input, id: crypto.randomUUID() });
  }
}
