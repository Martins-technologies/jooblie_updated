import { Database, SearchX } from 'lucide-react';
import SkeletonContent from './Skeleton';

export function LoadingState({ label = 'Loading...', compact = false, variant = 'list', rows, columns }) {
  return <SkeletonContent label={label} variant={variant} columns={columns} rows={rows || (compact ? 2 : 4)} />;
}

export function EmptyState({ title = 'Nothing to show yet', text = 'New content will appear here when it is available.', backendMissing = false }) {
  const Icon = backendMissing ? Database : SearchX;
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon size={25} /></span>
      <h3>{title}</h3>
      <p>{backendMissing ? 'Content is temporarily unavailable. Please try again shortly.' : text}</p>
    </div>
  );
}
