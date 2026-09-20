import type {
  AuditEvent,
  ChainRef,
  PersonalWealthPolicy,
  PolicySettings,
  Portfolio,
  Recommendation,
  WalletId,
} from '@/domain';
export interface PortfolioRepositoryPort {
  getLatest(walletId: WalletId, chain: ChainRef): Promise<Portfolio | null>;
  save(portfolio: Portfolio): Promise<void>;
}
export interface PolicyRepositoryPort {
  getActive(walletId: WalletId, chain: ChainRef): Promise<PersonalWealthPolicy | null>;
  saveNext(
    walletId: WalletId,
    chain: ChainRef,
    settings: PolicySettings,
  ): Promise<PersonalWealthPolicy>;
}
export interface RecommendationRepositoryPort {
  get(id: string): Promise<Recommendation | null>;
  save(recommendation: Recommendation): Promise<void>;
  transition(
    id: string,
    from: Recommendation['state'],
    to: Recommendation['state'],
  ): Promise<boolean>;
}
export interface AuditRepositoryPort {
  append(event: AuditEvent): Promise<void>;
}
