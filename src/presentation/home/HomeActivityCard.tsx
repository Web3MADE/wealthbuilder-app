'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, ShieldCheck } from 'lucide-react';
import type { DevActivity } from '@/infrastructure/dev/dev-activity-store';
import { activityTime, useDevActivity } from './use-dev-activity';

function ActivityIcon({ activity }: { activity: DevActivity }) {
  if (activity.kind === 'POLICY_UPDATED') return <ShieldCheck size={21} />;
  if (activity.kind === 'ACTION_BLOCKED' || activity.kind === 'EXECUTION_FAILED') {
    return <CircleAlert size={21} />;
  }
  if (activity.kind === 'SUPPLY_CONFIRMED') return <CheckCircle2 size={21} />;
  return <ArrowRight size={21} />;
}

export function HomeActivityCard() {
  const { items, error } = useDevActivity();
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, 3);

  return (
    <section className="home-card home-activity" id="activity">
      <div className="home-card-heading">
        <h2>Recent activity</h2>
        {items.length > 3 && (
          <button type="button" onClick={() => setShowAll((current) => !current)}>
            {showAll ? 'Show less' : 'View all'}
          </button>
        )}
      </div>
      <div>
        {visible.length === 0 ? (
          <p className="home-activity-empty">
            {error
              ? 'Activity is unavailable right now.'
              : 'Your WealthBuilder activity will appear here.'}
          </p>
        ) : (
          visible.map((activity) => (
            <details className="home-activity-row" key={activity.id}>
              <summary>
                <span className="home-activity-icon">
                  <ActivityIcon activity={activity} />
                </span>
                <span className="home-activity-text">
                  <strong>{activity.title}</strong>
                  <small>
                    {activityTime(activity.occurredAt)} · {activity.description}
                  </small>
                </span>
                <span className={`home-activity-value ${activity.status}`}>
                  {activity.amount ?? activity.status}
                </span>
              </summary>
              {activity.details && (
                <div className="home-activity-details">
                  <span>Status: {activity.details.executionStatus ?? activity.status}</span>
                  <span>Network: {activity.details.network}</span>
                  <span>Account: {activity.details.account}</span>
                  {activity.details.reference && (
                    <code>Transaction: {activity.details.reference}</code>
                  )}
                </div>
              )}
            </details>
          ))
        )}
      </div>
    </section>
  );
}
