import {useEffect,useState} from 'react';
import {CalendarDays,RotateCcw} from 'lucide-react';
import Select from '../../shared/components/Select';

function presetDates(days){const end=new Date().toISOString().slice(0,10),start=new Date(end+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-days+1);return {start:start.toISOString().slice(0,10),end};}
export default function OverviewDateFilter({analytics}){
  const [draft,setDraft]=useState(()=>analytics.range||presetDates(analytics.days)),[preset,setPreset]=useState(analytics.range?'custom':String(analytics.days)),[error,setError]=useState('');
  useEffect(()=>{setDraft(analytics.range||presetDates(analytics.days));setPreset(analytics.range?'custom':String(analytics.days));setError('');},[analytics.range,analytics.days]);
  const today=new Date().toISOString().slice(0,10);
  const change=(field,value)=>{setDraft(current=>({...current,[field]:value}));setPreset('custom');setError('');};
  const apply=event=>{
    event.preventDefault();
    const valid=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
    if(!valid(draft.start)||!valid(draft.end)){setError('Choose both a valid start date and end date.');return;}
    if(draft.start>draft.end){setError('Start date must be on or before the end date.');return;}
    if(draft.end>today){setError('Choose an end date on or before today.');return;}
    const days=Math.round((Date.parse(draft.end+'T00:00:00Z')-Date.parse(draft.start+'T00:00:00Z'))/86400000)+1;
    if(days>366){setError('Choose a range of 366 days or fewer.');return;}
    analytics.applyRange(draft.start,draft.end);setError('');
  };
  const applied=analytics.range||presetDates(analytics.days),dirty=draft.start!==applied.start||draft.end!==applied.end;
  return <div className="overview-compact-period" aria-label="Reporting date range"><form onSubmit={apply} noValidate><CalendarDays size={15}/><label><span className="sr-only">Period</span><Select aria-label="Reporting period" value={preset} onChange={event=>{const value=event.target.value;setPreset(value);setError('');if(value!=='custom')analytics.setDays(Number(value));}}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="custom">Custom dates</option></Select></label>{preset==='custom'&&<><label>From<input type="date" name="start" aria-label="Report start date" max={draft.end||today} value={draft.start} aria-invalid={Boolean(error)} aria-describedby={error?'overview-date-error':undefined} onChange={event=>change('start',event.target.value)}/></label><label>To<input type="date" name="end" aria-label="Report end date" min={draft.start||undefined} max={today} value={draft.end} aria-invalid={Boolean(error)} aria-describedby={error?'overview-date-error':undefined} onChange={event=>change('end',event.target.value)}/></label><button className="button button--primary" type="submit" disabled={!dirty}>Apply</button><button className="overview-date-reset" type="button" title="Reset to last 30 days" aria-label="Reset reporting period" onClick={()=>{setDraft(presetDates(30));setPreset('30');setError('');analytics.setDays(30);}}><RotateCcw size={16}/></button></>}</form>{error&&<p className="field-error" role="alert" id="overview-date-error">{error}</p>}</div>;
}
