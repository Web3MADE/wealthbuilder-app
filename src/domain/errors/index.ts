export class DomainError extends Error {
  readonly kind: string = 'DomainError';
}
export class StalePortfolioError extends DomainError {
  readonly kind = 'StalePortfolio';
}
export class UnsupportedActionError extends DomainError {
  readonly kind = 'UnsupportedAction';
}
export class InvalidStateTransitionError extends DomainError {
  readonly kind = 'InvalidStateTransition';
}
