import {useEffect,useId,useRef,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {ArrowUpRight,BriefcaseBusiness,Building2,Globe2,Loader2,Search,Users,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import '../styles/dashboardSearch.css';

function searchSources(role,term){
  const search=encodeURIComponent(term);
  if(role==='admin')return [
    {key:'jobs',label:'Jobs',icon:BriefcaseBusiness,path:`/admin/jobs?searchOnly=true&search=${search}&limit=4`,all:`/admin/jobs?search=${search}`,map:job=>({id:job.id,title:job.title||'Untitled job',detail:[job.companies?.name,job.city,job.province].filter(Boolean).join(' · '),to:`/admin/jobs?jobId=${encodeURIComponent(job.id)}`})},
    {key:'companies',label:'Companies',icon:Building2,path:`/admin/companies?searchOnly=true&search=${search}&limit=4`,all:`/admin/companies?search=${search}`,map:company=>({id:company.id,title:company.name||'Unnamed company',detail:company.website||'Company profile',to:`/admin/companies?id=${encodeURIComponent(company.id)}`})},
    {key:'users',label:'People',icon:Users,path:`/admin/users?search=${search}&limit=4`,all:`/admin/users?search=${search}`,map:person=>({id:person.id,title:person.full_name||person.email||'Unnamed member',detail:person.email||'Account',to:`/admin/users?search=${encodeURIComponent(person.email||person.full_name||term)}`})},
    {key:'portals',label:'Portals',icon:Globe2,path:`/admin/portals?optionsOnly=true&search=${search}&limit=4`,all:`/admin/portals?search=${search}`,map:portal=>({id:portal.id,title:portal.name,detail:portal.domain||portal.slug,to:`/admin/portals/${encodeURIComponent(portal.slug)}`})}
  ];
  return [
    {key:'jobs',label:'Jobs',icon:BriefcaseBusiness,path:`/public/jobs?q=${search}&limit=4`,all:`/all-jobs?q=${search}`,map:job=>({id:job.id,title:job.title||'Untitled job',detail:[job.companies?.name||job.company_name,job.city,job.province].filter(Boolean).join(' · '),to:role==='job_seeker'?`/dashboard/job-seeker/jobs/${encodeURIComponent(job.id)}`:`/jobs/${encodeURIComponent(job.id)}`})},
    {key:'companies',label:'Companies',icon:Building2,path:'/public/companies',filter:company=>String(company.name||'').toLocaleLowerCase().includes(term.toLocaleLowerCase()),map:company=>({id:company.id,title:company.name,detail:company.website||'Company profile',to:`/companies/${encodeURIComponent(company.id)}`})}
  ];
}

export default function DashboardSearch({role,pages=[]}){
  const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[mobile,setMobile]=useState(false),[revision,setRevision]=useState(0);
  const [state,setState]=useState({term:'',loading:false,groups:[],failed:[]});
  const cache=useRef(new Map());
  const root=useRef(null),input=useRef(null),panel=useRef(null),id=useId();
  const location=useLocation(),navigate=useNavigate(),term=query.trim();
  const valid=term.length>=2,current=state.term===term;
  const loading=valid&&(!current||state.loading);
  const groups=current?state.groups:[];
  const pageMatches=valid?pages.filter(([label])=>label.toLowerCase().includes(term.toLowerCase())).slice(0,3):[];
  useEffect(()=>{setOpen(false);setQuery('');setMobile(false);},[location.pathname,location.search]);
  useEffect(()=>{
    if(!valid){setState({term,loading:false,groups:[],failed:[]});return;}
    const key=term.toLocaleLowerCase(),saved=cache.current.get(key);
    if(saved&&Date.now()-saved.at<20000){setState({...saved.data,term});return;}
    const controller=new AbortController();
    setState({term,loading:true,groups:[],failed:[]});
    const timer=setTimeout(()=>{
      const sources=searchSources(role,term),found=new Map(),failed=[];let remaining=sources.length;
      const publish=()=>{
        if(controller.signal.aborted)return;
        const data={term,loading:remaining>0,groups:sources.flatMap(source=>found.has(source.key)?[found.get(source.key)]:[]),failed:[...failed]};
        setState(data);
        if(!remaining&&!failed.length){if(cache.current.size>=20)cache.current.delete(cache.current.keys().next().value);cache.current.set(key,{at:Date.now(),data});}
      };
      for(const source of sources){
        apiRequest(source.path,{auth:role==='admin',signal:controller.signal,notifyError:false,timeoutMs:8000}).then(response=>{
          if(controller.signal.aborted)return;
          if(!Array.isArray(response.items))throw new Error('Search unavailable');
          const rows=source.filter?response.items.filter(source.filter):response.items;
          found.set(source.key,{...source,total:source.filter?rows.length:response.pagination?.total??rows.length,items:rows.slice(0,4).map(source.map)});
        }).catch(()=>{if(!controller.signal.aborted)failed.push(source.label);}).finally(()=>{remaining--;publish();});
      }
    },150);
    return()=>{clearTimeout(timer);controller.abort();};
  },[term,valid,role,revision]);
  useEffect(()=>{
    const outside=event=>{if(!root.current?.contains(event.target)){setOpen(false);setMobile(false);}};
    const shortcut=event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setMobile(true);setOpen(true);requestAnimationFrame(()=>input.current?.focus());}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',shortcut);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',shortcut);};
  },[]);
  const show=open&&(valid||mobile);
  const fallback=role==='admin'?`/admin/jobs?search=${encodeURIComponent(term)}`:`/all-jobs?q=${encodeURIComponent(term)}`;
  const submit=event=>{event.preventDefault();if(!term)return;const first=pageMatches[0]?.[1]||groups.find(group=>group.items.length)?.items[0]?.to;navigate(first||fallback);setOpen(false);setQuery('');setMobile(false);};
  const keyboard=event=>{
    if(event.key==='Escape'){event.preventDefault();input.current?.focus();setOpen(false);setMobile(false);return;}
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    if(!open){setOpen(true);return;}
    const links=[...(panel.current?.querySelectorAll('a[data-global-result]')||[])];
    if(!links.length)return;
    event.preventDefault();const index=links.indexOf(document.activeElement),next=event.key==='ArrowDown'?(index+1)%links.length:(index<0?links.length-1:(index-1+links.length)%links.length);links[next]?.focus();
  };
  return <div ref={root} className={'workspace-global-search'+(mobile?' is-mobile-open':'')} onKeyDown={keyboard} onBlur={event=>{if(event.relatedTarget&&!root.current?.contains(event.relatedTarget))setOpen(false);}}>
    <button type="button" className="global-search-mobile-toggle" aria-label="Open global search" onClick={()=>{const next=!mobile;setMobile(next);setOpen(next);if(next)requestAnimationFrame(()=>input.current?.focus());}}><Search size={20}/></button>
    <form role="search" className="workspace-search" onSubmit={submit}><Search size={17}/><input ref={input} type="search" aria-label="Search across your dashboard" aria-expanded={show} aria-controls={show?id:undefined} aria-haspopup="dialog" autoComplete="off" maxLength={120} placeholder={role==='admin'?'Search jobs, companies, people…':'Search jobs and companies…'} value={query} onChange={event=>{setQuery(event.target.value);setOpen(true);}} onFocus={()=>setOpen(true)}/>{query?<button type="button" className="global-search-clear" aria-label="Clear global search" onClick={()=>{setQuery('');input.current?.focus();}}><X size={14}/></button>:<kbd>⌘/Ctrl K</kbd>}</form>
    {show&&<div ref={panel} id={id} className="global-search-results" role="dialog" aria-label="Global search results">
      {!valid?<p className="global-search-message">Type at least 2 characters to search.</p>:<>
        {pageMatches.length>0&&<section className="global-search-group"><div className="global-search-group-heading"><strong>Pages</strong></div>{pageMatches.map(([label,to,Icon])=><Link key={to} to={to} data-global-result onClick={()=>setOpen(false)}><span className="global-search-result-icon"><Icon size={16}/></span><span className="global-search-result-copy"><strong>{label}</strong><small>Open workspace page</small></span><ArrowUpRight size={14}/></Link>)}</section>}
        <>
          {groups.filter(group=>group.items.length).map(group=><section key={group.key} className="global-search-group"><div className="global-search-group-heading"><strong>{group.label}</strong>{group.all?<Link to={group.all} data-global-result onClick={()=>setOpen(false)}>View all{group.total!=null?' ('+group.total+')':''}<ArrowUpRight size={12}/></Link>:<span>{group.total} matches</span>}</div>{group.items.map(item=><Link key={item.id} to={item.to} data-global-result onClick={()=>setOpen(false)}><span className="global-search-result-icon"><group.icon size={16}/></span><span className="global-search-result-copy"><strong>{item.title}</strong><small>{item.detail}</small></span><ArrowUpRight size={14}/></Link>)}</section>)}
          {!loading&&!groups.some(group=>group.items.length)&&!pageMatches.length&&!state.failed.length&&<p className="global-search-message" role="status">No matches for “{term}”. Try another name or title.</p>}
          {loading&&<p className="global-search-message" role="status"><Loader2 size={16} className="global-search-spinner"/>{groups.length?'Loading remaining results…':'Searching…'}</p>}
          {state.failed.length>0&&<div className="global-search-error" role="status"><span>{state.failed.join(', ')} search is unavailable.</span><button type="button" onClick={()=>{cache.current.delete(term.toLocaleLowerCase());setRevision(value=>value+1);}}>Retry</button></div>}
        </>
      </>}
      <div className="global-search-hint">↑ ↓ to move<span>Enter to open · Esc to close</span></div>
    </div>}
  </div>;
}
