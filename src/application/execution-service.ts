import {
  type ExecutionAuthorization,
  type ExecutionPreview,
  type ExecutionSubmission,
  UnsupportedActionError,
} from '@/domain';
import type { ProtocolRegistryPort } from './ports/protocol';
import type { RecommendationRepositoryPort } from './ports/repositories';

export async function prepareExecution(
  dependencies: Readonly<{
    protocols: ProtocolRegistryPort;
    recommendations: RecommendationRepositoryPort;
  }>,
  recommendationId: string,
  authorization: ExecutionAuthorization,
): Promise<ExecutionPreview> {
  const recommendation = await dependencies.recommendations.get(recommendationId);
  if (!recommendation) throw new UnsupportedActionError('Recommendation does not exist.');
  if (!['PENDING_APPROVAL', 'AUTONOMOUS_AUTHORIZED'].includes(recommendation.state))
    throw new UnsupportedActionError('Recommendation is not approved for execution.');
  const protocol = dependencies.protocols.get(recommendation.action.protocolId);
  if (!protocol) throw new UnsupportedActionError('Protocol is not available.');
  return protocol.prepare(recommendation.action, authorization);
}

export async function submitExecution(
  dependencies: Readonly<{
    protocols: ProtocolRegistryPort;
    recommendations: RecommendationRepositoryPort;
  }>,
  recommendationId: string,
  preview: ExecutionPreview,
  authorization: ExecutionAuthorization,
): Promise<ExecutionSubmission> {
  const recommendation = await dependencies.recommendations.get(recommendationId);
  if (!recommendation) throw new UnsupportedActionError('Recommendation does not exist.');
  const protocol = dependencies.protocols.get(recommendation.action.protocolId);
  if (!protocol) throw new UnsupportedActionError('Protocol is not available.');
  const transitioned = await dependencies.recommendations.transition(
    recommendationId,
    recommendation.state,
    'SUBMITTED',
  );
  if (!transitioned)
    throw new UnsupportedActionError('Execution was already submitted or the state changed.');
  return protocol.execute(preview.handle, authorization);
}
