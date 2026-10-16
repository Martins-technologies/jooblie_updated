import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, RefreshCw, Search, X } from 'lucide-react';
import { TablePagination } from '../../shared/components/DashboardTable';
import Select from '../../shared/components/Select';
import SkeletonContent from '../../shared/components/Skeleton';
import { apiRequest } from '../../shared/lib/api';

export function useAdminCollection(path, defaults = {}) {
  const [params, setParams] = useSearchParams();
  const key = new URLSearchParams({ limit: '10', ...defaults, ...Object.fromEntries(params) }).toString();
  const [state, setState] = useState({ loading: true, error: '', items: [], pagination: {} });
  const [revision, setRevision] = useState(0);
  const update = useCallback(values => setParams(current => {
    const next = new URLSearchParams(current);
    if (!('page' in values)) next.set('page', '1');
    Object.entries(values).forEach(([key, value]) => value == null || value === '' ? next.delete(key) : next.set(key, String(value)));
    return next;
  }, { replace: true }), [setParams]);
  useEffect(() => {
    const controller = new AbortController();
    setState(previous => ({ ...previous, loading: true, error: '' }));
    apiRequest(`${path}?${key}`, { auth: true, signal: controller.signal, notifyError: false }).then(data => {
      if (controller.signal.aborted) return;
      if (data.pagination?.page > 1 && !data.items?.length) {
        update({ page: Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit)) }); return;
      }
      setState({ ...data, items: data.items || [], loading: false, error: '' });
    }).catch(error => { if (!controller.signal.aborted) setState({ loading: false, error: error.message, items: [], pagination: {} }); });
    return () => controller.abort();
  }, [path, key, revision, update]);
  return { ...state, params: new URLSearchParams(key), update, clear: () => setParams({}), reload: () => setRevision(value => value + 1) };
}
export function CollectionToolbar({ collection, searchLabel, children }) {
  const actual = collection.params.get('search') || collection.params.get('q') || '';
  const [draft, setDraft] = useState(actual);
  useEffect(() => { setDraft(actual); }, [actual]);
  useEffect(() => {
    if (draft === actual) return;
    const timer = setTimeout(() => collection.update({ search: draft.trim(), q: null }), 300);
    return () => clearTimeout(timer);
  }, [draft, actual, collection.update]);
  const filtered=['search','q','role','status','active','verification','severity','siteId','mappedSiteId','jobId','id'].some(key => collection.params.get(key) && collection.params.get(key)!=='all');
  return <div className="admin-toolbar">{searchLabel && <label className="admin-search"><Search size={17} /><input type="search" aria-label={searchLabel} placeholder={searchLabel} value={draft} maxLength={120} onChange={event => setDraft(event.target.value)} /></label>}{children}{filtered && <button type="button" className="admin-row-action" onClick={collection.clear}>Clear filters</button>}<button type="button" className="admin-icon" title="Refresh records" aria-label="Refresh records" disabled={collection.loading} onClick={collection.reload}><RefreshCw size={16} /></button></div>;
}
export function Filter({ collection, name, label, options }) {
  return <Select aria-label={label} value={collection.params.get(name) || 'all'} onChange={event => collection.update({ [name]: event.target.value })}><option value="all">{label}</option>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</Select>;
}
function SortHeading({column,collection}) {
  const active=collection.params.get('sort')===column.sort;
  const ascending=collection.params.get('direction')==='asc';
  const next=active&&ascending?'desc':'asc';
  return <button type="button" className="admin-sort-button" data-active={active?'true':'false'} title={`Sort by ${column.label}, ${next==='asc'?'ascending':'descending'}`} onClick={()=>collection.update({sort:column.sort,direction:next})}><span>{column.label}</span><span className="admin-sort-indicator" aria-hidden="true"><ChevronUp size={11} strokeWidth={2.2} className={active&&ascending?'is-active':''}/><ChevronDown size={11} strokeWidth={2.2} className={active&&!ascending?'is-active':''}/></span></button>;
}
export function CollectionTable({ collection, columns, children, noun='records', empty = 'No records match these filters.' }) {
  const { page=1,limit=10,total=0 } = collection.pagination || {};
  const filtered=[...collection.params.entries()].some(([key,value])=>!['page','limit','sort','direction'].includes(key)&&value&&value!=='all');
  if(collection.loading) return <SkeletonContent variant="table" columns={columns} rows={Number(collection.params.get('limit'))||10} label="Loading records"/>;
  if(collection.error) return <div className="admin-state" role="alert"><strong>We couldn’t load these records</strong><p>{collection.error}</p><button type="button" className="button button--secondary" onClick={collection.reload}>Try again</button></div>;
  return <><div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Records table. Scroll horizontally for additional columns."><table className="admin-table" style={{minWidth:columns.length>6?1100:1000}}><colgroup>{columns.map((column,index)=><col key={column.label} style={{width:column.width || (index===0?'28%':index===columns.length-1?'16%':`${56/Math.max(1,columns.length-2)}%`)}}/>)}</colgroup><thead><tr>{columns.map(column=><th key={column.label} scope="col" aria-sort={column.sort && collection.params.get('sort')===column.sort ? collection.params.get('direction')==='asc'?'ascending':'descending':undefined}>{column.sort?<SortHeading column={column} collection={collection}/>:column.label}</th>)}</tr></thead><tbody>{children}</tbody></table></div>{!collection.items.length&&<div className="admin-state" role="status"><Search size={24} aria-hidden="true"/><strong>{filtered?empty:`No ${noun} yet`}</strong><p>{filtered?'Try another search or clear the filters to see more results.':`New ${noun} will appear here when they are added.`}</p>{filtered&&<button type="button" className="button button--secondary" onClick={()=>{const reset={page:1};for(const [key] of collection.params.entries())if(!['limit','sort','direction'].includes(key))reset[key]=null;reset.page=1;collection.update(reset);}}>Clear filters</button>}</div>}<TablePagination page={page} pageSize={limit} total={total} noun={noun} onPageChange={page=>collection.update({page})} onPageSizeChange={limit=>collection.update({limit})}/></>;
}
export function AdminDialog({ title, children, onClose, busy = false }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.showModal();
    return () => { dialog.current?.close(); previous?.isConnected && previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="admin-dialog" aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} onClick={event => { if (event.target === event.currentTarget && !busy) onClose(); }}><div className="admin-dialog__header"><h2>{title}</h2><button className="admin-icon" type="button" disabled={busy} aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div><div className="admin-dialog__body">{children}</div></dialog>;
}
