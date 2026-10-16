export function publicJobUrl(job,base){
 if(!job?.id||job.isActive!==true)throw new Error('Only current public openings can be shared.');
 const raw=job.raw||{};const deadline=raw.expires_at||raw.closes_at;
 if(deadline&&new Date(deadline).getTime()<=Date.now())throw new Error('This opening has expired.');
 const origin=new URL(base);if(!['https:','http:'].includes(origin.protocol))throw new Error('Invalid public website URL.');
 return new URL('/jobs/'+encodeURIComponent(job.id),origin.origin).href;
}
export async function shareJob(job,{base,navigator:nav}){
 const url=publicJobUrl(job,base);
 if(nav.share){try{await nav.share({title:job.title,text:job.title,url});return 'Shared';}catch(error){if(error.name==='AbortError')return '';}}
 if(nav.clipboard?.writeText){try{await nav.clipboard.writeText(url);return 'Link copied';}catch{}}
 // A blocked clipboard or unavailable native API still exposes a usable manual link.
 return url;
}
