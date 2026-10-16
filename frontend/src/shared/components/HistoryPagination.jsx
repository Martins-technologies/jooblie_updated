export default function HistoryPagination({ page, pageSize, total, loading, onPageChange }) {
  if (!total) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <nav aria-label="History pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
      <span aria-live="polite">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="button button--secondary" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</button>
        <span>Page {page} of {pages}</span>
        <button className="button button--secondary" disabled={loading || page >= pages} onClick={() => onPageChange(page + 1)}>Next</button>
      </div>
    </nav>
  );
}
