import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, LogOut, Settings, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import { notificationContent } from '../lib/notificationPresentation';
import SkeletonContent from './Skeleton';
import '../styles/accountTools.css';

const labels={admin:'Administrator',recruiter:'Recruiter',job_seeker:'Job seeker'};
export default function WorkspaceAccountTools({ name,settings,onSignOut,signingOut }) {
  const {profile,role,user}=useAuth();
  const [open,setOpen]=useState(null),[filter,setFilter]=useState('all'),[page,setPage]=useState(1);
  const [state,setState]=useState({loading:true,error:'',items:[],unread:null,pagination:{}}),[working,setWorking]=useState(false);
  const container=useRef(null),bell=useRef(null),avatar=useRef(null),request=useRef(null),pending=useRef(false),alive=useRef(true);
  const navigate=useNavigate(),location=useLocation();
  const load=useCallback(async(background=false)=>{
    if(pending.current)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setState(previous=>({...previous,loading:background ? !previous.loaded : true,error:''}));
    try {const data=await apiRequest(`/notifications?page=${page}&limit=10${filter==='unread'?'&unread=true':''}`,{auth:true,signal:controller.signal,notifyError:false});if(!controller.signal.aborted&&alive.current){if(!data.items?.length&&page>1){setPage(page-1);return;}setState({...data,loading:false,error:'',loaded:true});}}
    catch(error){if(!controller.signal.aborted&&alive.current)setState(previous=>({...previous,loading:false,error:error.message}));}
  },[page,filter,user?.id]);
  useEffect(()=>{alive.current=true;load();const poll=setInterval(()=>{if(document.visibilityState==='visible')load(true);},60000);const visible=()=>{if(document.visibilityState==='visible')load(true);};document.addEventListener('visibilitychange',visible);return()=>{alive.current=false;request.current?.abort();clearInterval(poll);document.removeEventListener('visibilitychange',visible);};},[load]);
  useEffect(()=>{setOpen(null);},[location.pathname,location.search]);
  useEffect(()=>{
    if(!open)return;
    const returnTo=open==='notifications'?bell.current:avatar.current;
    container.current?.querySelector('[data-account-panel] button,[data-account-panel] a')?.focus();
    const outside=event=>{if(!container.current?.contains(event.target))setOpen(null);};
    const keyboard=event=>{if(event.key==='Escape'){event.preventDefault();setOpen(null);returnTo?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',keyboard);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',keyboard);};
  },[open]);
  async function mark(item,read,to=null){
    if(pending.current)return;pending.current=true;request.current?.abort();setWorking(true);
    let saved=false;
    try{
      await apiRequest(`/notifications/${item.id}`,{method:'PATCH',auth:true,notifyError:false,body:{read}}); saved=true;
      if(to){setOpen(null);navigate(to);}
    }catch(error){if(alive.current)setState(previous=>({...previous,error:error.message}));}
    finally{pending.current=false;if(alive.current){if(saved)await load(true);setWorking(false);}}
  }
  async function readAll(){
    if(pending.current||!state.unread)return;pending.current=true;request.current?.abort();setWorking(true);
    let saved=false;
    try{await apiRequest('/notifications/read-all',{method:'PATCH',auth:true,notifyError:false,body:{before:new Date().toISOString()}});saved=true;}
    catch(error){if(alive.current)setState(previous=>({...previous,error:error.message}));}
    finally{pending.current=false;if(alive.current){if(saved)await load(true);setWorking(false);}}
  }
  return <div className="account-tools" ref={container} onBlur={event=>{if(event.relatedTarget && !event.currentTarget.contains(event.relatedTarget))setOpen(null);}}>
    <button ref={bell} type="button" className="workspace-icon-button account-bell" aria-label={`Notifications${state.unread!=null?`, ${state.unread} unread`:''}`} aria-expanded={open==='notifications'} aria-controls="workspace-notifications" onClick={()=>{setOpen(current=>current==='notifications'?null:'notifications');if(open!=='notifications')load(true);}}><Bell size={19}/>{state.unread>0&&<span className="account-unread">{state.unread>99?'99+':state.unread}</span>}</button>
    {open==='notifications'&&<section id="workspace-notifications" className="account-popover notification-center" data-account-panel role="dialog" aria-label="Notification center"><div className="notification-center__heading"><div><strong>Notifications</strong><small>{state.unread==null?'Your account activity':`${state.unread} unread`}</small></div><button type="button" aria-label="Close notifications" className="notification-icon" onClick={()=>{setOpen(null);bell.current?.focus();}}><X size={17}/></button></div><div className="notification-center__toolbar"><div><button type="button" className={filter==='all'?'is-active':''} disabled={working} onClick={()=>{setFilter('all');setPage(1);}}>All</button><button type="button" className={filter==='unread'?'is-active':''} disabled={working} onClick={()=>{setFilter('unread');setPage(1);}}>Unread</button></div><button type="button" disabled={working||!state.unread||state.loading} onClick={readAll}><CheckCheck size={14}/>Mark all read</button></div>
      <div className="notification-center__list" aria-busy={state.loading||working}>{state.error&&<div className="notification-error" role="alert"><span>{state.error}</span><button type="button" onClick={load}>Retry</button></div>}{state.loading?<SkeletonContent rows={3} label="Loading notifications"/>:!state.error&&!state.items.length?<div className="notification-empty"><Bell size={26}/><strong>{filter==='unread'?'You’re all caught up':'No notifications yet'}</strong><span>New account activity will appear here.</span></div>:state.items.map(item=>{const content=notificationContent(item,role);return <article key={item.id} className={`notification-item${!item.read_at?' is-unread':''}`}><span className="notification-item__dot"/><div><strong>{content.title}</strong>{content.message&&<p>{content.message}</p>}<time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</time><div className="notification-item__actions">{content.to&&<button type="button" disabled={working} onClick={()=>item.read_at?(setOpen(null),navigate(content.to)):mark(item,true,content.to)}>View details</button>}<button type="button" disabled={working} onClick={()=>mark(item,!item.read_at)}>{item.read_at?'Mark unread':'Mark read'}</button></div></div></article>;})}</div>
      <div className="notification-center__footer"><Link to={`${settings}?tab=notifications`}>Preferences</Link><div><button type="button" className="notification-icon" aria-label="Previous notifications" disabled={state.loading||working||page<=1} onClick={()=>setPage(current=>current-1)}><ChevronLeft size={15}/></button><span>Page {page}</span><button type="button" className="notification-icon" aria-label="Next notifications" disabled={state.loading||working||page*10>=(state.pagination?.total||0)} onClick={()=>setPage(current=>current+1)}><ChevronRight size={15}/></button></div></div>
    </section>}
  </div>;
}
