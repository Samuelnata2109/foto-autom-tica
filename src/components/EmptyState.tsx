import type { LucideIcon } from 'lucide-react';

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Icon size={30} strokeWidth={1.55} aria-hidden="true" />
      </span>
      <p className="empty-state__title">{title}</p>
      <p>{description}</p>
    </div>
  );
}
