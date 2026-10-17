import { Skeleton } from './Skeleton';

// Keep route loading inside the public shell so navigation remains available.
export default function PageLoading({ standalone = false }) {
  return (
    <div className={`page-loading${standalone ? ' page-loading--standalone' : ''}`} role="status" aria-busy="true">
      <span className="sr-only">Loading page, please wait.</span>
      <div className="page-loading__heading" aria-hidden="true">
        <Skeleton width={110} height={12} />
        <Skeleton width="min(460px, 85%)" height={38} />
        <Skeleton width="min(560px, 95%)" height={14} />
        <Skeleton width="min(380px, 70%)" height={14} />
      </div>
      <div className="page-loading__toolbar" aria-hidden="true">
        <Skeleton width="65%" height={44} />
        <Skeleton width={130} height={44} />
      </div>
      <div className="page-loading__grid" aria-hidden="true">
        {Array.from({ length: standalone ? 2 : 6 }, (_, index) => (
          <div className="page-loading__card" key={index}>
            <div className="page-loading__card-heading"><Skeleton width={44} height={44} /><div><Skeleton width="85%" height={17} /><Skeleton width="60%" height={12} /></div></div>
            <div className="page-loading__tags"><Skeleton width={90} height={25} /><Skeleton width={70} height={25} /></div>
            <Skeleton height={13} /><Skeleton width="78%" height={13} />
            <div className="page-loading__card-footer"><Skeleton width={100} height={12} /><Skeleton width={80} height={12} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
