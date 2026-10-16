import {useId} from 'react';

export default function JobSparkline({values,label}) {
  const id=useId().replaceAll(':','');
  if(!Array.isArray(values)||values.length<2)return <span className="jobs-sparkline-unavailable" aria-label="Chart unavailable">—</span>;
  const data=values.map(value=>Math.max(0,Number(value)||0)),max=Math.max(...data,1);
  const points=data.map((value,index)=>[5+index*80/(data.length-1),34-value/max*26]);
  let line=`M ${points[0].join(' ')}`;
  for(let index=1;index<points.length;index++){
    const [x,y]=points[index],[px,py]=points[index-1],mid=(x+px)/2;
    line+=` C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`;
  }
  const last=points.at(-1);
  return <svg className="jobs-sparkline" viewBox="0 0 90 42" role="img" aria-label={`${label}: jobs created per day over the last 7 days, UTC. ${data.join(', ')}`}><title>{label} · Daily job additions, last 7 days (UTC): {data.join(', ')}</title><defs><linearGradient id={'jobs-chart-'+id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".2"/><stop offset="100%" stopColor="currentColor" stopOpacity="0"/></linearGradient></defs><path d={line+` L ${last[0]} 41 L 5 41 Z`} fill={`url(#jobs-chart-${id})`}/><path className="jobs-sparkline__line" d={line} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" pathLength="1"/><circle cx={last[0]} cy={last[1]} r="2" fill="currentColor"/></svg>;
}
