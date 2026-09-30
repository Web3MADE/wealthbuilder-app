import type { ReactNode } from 'react';

export type PreferenceOptionClassNames = Readonly<{
  root: string;
  icon: string;
  copy: string;
  label: string;
  description: string;
  check: string;
}>;

export function PreferenceOption({
  label,
  description,
  icon,
  selected,
  onSelect,
  classNames,
}: {
  label: string;
  description: string;
  icon?: ReactNode;
  selected: boolean;
  onSelect: () => void;
  classNames: PreferenceOptionClassNames;
}) {
  return (
    <button
      type="button"
      className={`${classNames.root} ${selected ? 'is-selected' : ''}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {icon ? (
        <span className={classNames.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <span className={classNames.copy}>
        <strong className={classNames.label}>{label}</strong>
        <small className={classNames.description}>{description}</small>
      </span>
      <span className={classNames.check} aria-hidden="true">
        {selected ? '✓' : ''}
      </span>
    </button>
  );
}
