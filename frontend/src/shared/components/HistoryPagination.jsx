import { TablePagination } from './DashboardTable';
export default function HistoryPagination({page,pageSize,total,loading,onPageChange}) {
  if(!total)return null;
  return <TablePagination page={page} pageSize={pageSize} total={total} loading={loading} onPageChange={onPageChange}/>;
}
