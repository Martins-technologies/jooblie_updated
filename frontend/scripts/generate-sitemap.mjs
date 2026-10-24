import {writeFile} from 'node:fs/promises';
const base=process.env.VITE_PUBLIC_SITE_URL;if(!base||new URL(base).protocol!=='https:')throw new Error('Set VITE_PUBLIC_SITE_URL to the approved HTTPS origin.');
const paths=['/','/all-jobs','/companies','/categories','/about','/contact','/resources','/mississauga/register'];
const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
await writeFile(new URL('../public/sitemap.xml',import.meta.url),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+escape(new URL(path,base).href)+'</loc></url>').join('')+'</urlset>');
console.log('Static public sitemap generated. Add verified current job URLs through the deployment feed; never include expired jobs.');
