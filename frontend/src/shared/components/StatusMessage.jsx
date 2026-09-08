import { Database, SearchX } from 'lucide-react';

export function LoadingState({ label = 'Loading...', compact = false }) {
  return (
    <div className={`loading-state${compact ? ' loading-state--compact' : ''}`} role="status" aria-live="polite">
      <span className="loading-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ title = 'Nothing to show yet', text = 'New content will appear here when it is available.', backendMissing = false }) {
  const Icon = backendMissing ? Database : SearchX;
  return (
    <div className="empty-state">
      <span className="empty-state__icon"><Icon size={25} /></span>
      <h3>{title}</h3>
      <p>{backendMissing ? 'Add the Supabase URL and anon key in your environment file to load live data.' : text}</p>
    </div>
  );
}
