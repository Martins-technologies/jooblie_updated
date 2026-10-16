import { ChevronLeft, ChevronRight } from 'lucide-react';
import Select from './Select';
import { tablePageTokens } from '../lib/tablePagination';
import '../styles/tables.css';

export default function DashboardTable({ columns, children, label='Records', className='' }) {
  return <div className="dashboard-table-scroll" role="region" aria-label={`${label}. Scroll horizontally for more columns.`} tabIndex={0}><table className={`dashboard-data-table ${className}`}><colgroup>{columns.map((column,index)=><col key={column.label} style={{width:column.width || (index===0?'28%':index===columns.length-1?'16%':`${56/Math.max(1,columns.length-2)}%`)}}/>)}</colgroup><thead><tr>{columns.map(column=><th key={column.label} scope="col" className={column.align==='right'?'is-numeric':''}>{column.label}</th>)}</tr></thead><tbody>{children}</tbody></table></div>;
}
export function TablePagination({page=1,pageSize=10,total=0,loading=false,onPageChange,onPageSizeChange,noun='records',pageSizes=[10,20,50,100]}) {
  const pages=Math.max(1,Math.ceil(total/pageSize));
  return <nav className="dashboard-pagination" aria-label={`${noun} pages`}><span role="status">{total?`Showing ${((page-1)*pageSize+1).toLocaleString()}–${Math.min(page*pageSize,total).toLocaleString()} of ${total.toLocaleString()} ${noun}`:`0 ${noun}`}</span><div className="dashboard-pagination__controls"><button type="button" className="table-page-direction" disabled={loading||page<=1} onClick={()=>onPageChange(page-1)} aria-label="Previous page"><ChevronLeft size={14}/><span>Previous</span></button>{tablePageTokens(page,pages).map(token=>typeof token==='number'?<button key={token} type="button" className={`table-page-number${token===page?' is-current':''}`} aria-label={`Page ${token}`} aria-current={token===page?'page':undefined} disabled={loading} onClick={()=>{if(token!==page)onPageChange(token);}}>{token}</button>:<span key={token} className="table-page-gap" aria-hidden="true">…</span>)}<button type="button" className="table-page-direction" disabled={loading||page>=pages} onClick={()=>onPageChange(page+1)} aria-label="Next page"><span>Next</span><ChevronRight size={14}/></button>{onPageSizeChange&&<Select aria-label="Records per page" value={String(pageSize)} disabled={loading} onChange={event=>onPageSizeChange(Number(event.target.value))}>{[...new Set([...pageSizes,pageSize])].sort((a,b)=>a-b).map(size=><option key={size} value={String(size)}>{size} per page</option>)}</Select>}</div></nav>;
}
export function TableStatusTabs({value,onChange,items,label='Filter by status'}) {
  return <nav className="table-status-tabs" aria-label={label}>{items.map(([status,text,count])=><button key={status} type="button" className={value===status?'is-active':''} aria-pressed={value===status} onClick={()=>{if(status!==value)onChange(status);}}>{text}{count!=null&&<span>{count}</span>}</button>)}</nav>;
}
