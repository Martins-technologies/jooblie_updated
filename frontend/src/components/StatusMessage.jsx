import { Database, SearchX } from 'lucide-react';

export function LoadingState({ label = 'Loading...' }) {
  return <div className="loading-state"><span className="spinner" /> {label}</div>;
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
