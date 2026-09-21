import { Check, Circle, LoaderCircle, Zap } from 'lucide-react';
import type { ActionPlan } from '@/domain';
import type { PlanExecution } from '@/presentation/planning/ExecutionPlan';
import { actionTitle } from './response-utils';

const steps = [
  ['preparing', 'Preparing action', 'Validating your request and checking your portfolio.'],
  ['executing', 'Executing action', 'Submitting the approved action.'],
  ['confirming', 'Confirming result', 'Waiting for confirmation on the network.'],
  ['completed', 'Completed', 'Your portfolio will refresh when confirmed.'],
] as const;

export function ExecutionLifecycle({
  action,
  execution,
}: {
  action: ActionPlan['proposedActions'][number];
  execution: PlanExecution;
}) {
  const current = steps.findIndex(([status]) => status === execution.status);
  return (
    <section
      className="chat-response-card chat-execution-lifecycle"
      aria-label="Action execution progress"
    >
      <div className="chat-response-kicker">
        <Zap aria-hidden="true" />
        <span>Action execution</span>
      </div>
      <h2>
        {execution.status === 'preparing' ? 'Preparing your action' : 'Executing your action'}
      </h2>
      <p>{actionTitle(action)}</p>
      <ol>
        {steps.map(([status, title, detail], index) => {
          const complete = index < current;
          const active = index === current;
          return (
            <li key={status} className={complete ? 'complete' : active ? 'active' : ''}>
              <span className="chat-execution-step-icon">
                {complete ? (
                  <Check aria-hidden="true" />
                ) : active ? (
                  <LoaderCircle aria-hidden="true" />
                ) : (
                  <Circle aria-hidden="true" />
                )}
              </span>
              <div>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
