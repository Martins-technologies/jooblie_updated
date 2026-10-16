import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export default function JobMenu({label,icon:Icon,iconOnly=false,disabled=false,items}) {
  const wide=items.some(item=>item.description);
  const [open,setOpen]=useState(false),[box,setBox]=useState(null);
  const trigger=useRef(null),menu=useRef(null);
  function close(focus=false){setOpen(false);if(focus)trigger.current?.focus();}
  useLayoutEffect(()=>{
    if(!open)return;
    const position=()=>{const rect=trigger.current.getBoundingClientRect(),height=items.reduce((total,item)=>total+(item.description?62:43),12),width=wide?286:228;setBox({left:Math.max(8,Math.min(rect.right-width,innerWidth-width-8)),top:rect.bottom+height+8>innerHeight?Math.max(8,rect.top-height-6):rect.bottom+6});};
    position();
    const outside=event=>{if(!trigger.current?.contains(event.target)&&!menu.current?.contains(event.target))close();};
    const scroll=event=>{if(!menu.current?.contains(event.target))close();};
    document.addEventListener('pointerdown',outside,true);window.addEventListener('scroll',scroll,true);window.addEventListener('resize',position);
    return()=>{document.removeEventListener('pointerdown',outside,true);window.removeEventListener('scroll',scroll,true);window.removeEventListener('resize',position);};
  },[open,items.length,wide]);
  useEffect(()=>{if(open&&box)menu.current?.querySelector('button')?.focus();},[open,Boolean(box)]);
  useEffect(()=>{if(disabled)close();},[disabled]);
  const keyboard=event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);return;}
    if(event.key==='Tab'){close();return;}
    const buttons=[...menu.current.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);
    let next;
    if(event.key==='ArrowDown')next=(index+1)%buttons.length;
    if(event.key==='ArrowUp')next=(index-1+buttons.length)%buttons.length;
    if(event.key==='Home')next=0;
    if(event.key==='End')next=buttons.length-1;
    if(next!=null){event.preventDefault();buttons[next]?.focus();}
  };
  return <><button ref={trigger} type="button" className={iconOnly?'jobs-icon-button':'jobs-toolbar-button'} aria-label={label} title={iconOnly?label:undefined} aria-haspopup="menu" aria-expanded={open} disabled={disabled} onClick={()=>setOpen(value=>!value)} onKeyDown={event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();setOpen(true);}if(event.key==='Escape')close(true);}}><Icon size={18}/>{!iconOnly&&<>{label}<ChevronDown size={14}/></>}</button>{open&&box&&createPortal(<div ref={menu} className={wide?'jobs-menu jobs-menu--export':'jobs-menu'} role="menu" aria-label={label} style={{left:box.left,top:box.top}} onKeyDown={keyboard}>{items.map(({label:text,description,icon:ItemIcon,action,danger})=><button key={text} type="button" role="menuitem" className={danger?'is-danger':''} onClick={()=>{close(true);action();}}>{ItemIcon&&<ItemIcon size={16}/>}<span className="jobs-menu-item-copy"><span>{text}</span>{description&&<small>{description}</small>}</span></button>)}</div>,document.body)}</>;
}
