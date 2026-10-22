import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
const pages = {
  '/': ['A clearer path from opportunity to application', 'Jooblie brings job discovery, employer profiles, and applications into one recruitment platform. Search by role, location, and supported work preferences.'],
  '/all-jobs': ['Browse Jobs', 'Search current openings by title, location, salary, and supported work preferences on Jooblie.'],
  '/jobs': ['Recent Job Openings', 'Explore recently published employment opportunities on Jooblie.'],
  '/companies': ['Explore Employers', 'Discover company profiles and their current openings on Jooblie.'],
  '/categories': ['Job Categories', 'Explore specialist hiring categories and current openings on Jooblie.'],
  '/contact': ['Contact Jooblie', 'Get in touch with Jooblie regarding accounts, job listings, and hiring solutions.'],
  '/about': ['About Jooblie', 'Learn how Jooblie creates a clearer path from opportunity to application for candidates and employers.'],
  '/resources': ['Career & Hiring Resources', 'Practical guides for job searches, applications, company profiles, and clear job listings on Jooblie.'],
  '/terms': ['Terms of Use', 'Review the Jooblie platform terms of use, account guidelines, and hiring responsibilities.'],
  '/privacy': ['Privacy Policy', 'Read how Jooblie handles account information, recruitment data, and privacy requests.'],
  '/privacy-policy': ['Privacy Policy', 'Read how Jooblie handles account information, recruitment data, and privacy requests.'],
};
export default function RouteMetadata(){const {pathname,search}=useLocation();useEffect(()=>{const privatePage=/^\/(dashboard|admin|account|settings|my-|candidates|post-job)/.test(pathname);const item=pages[pathname]||[pathname.startsWith('/jobs/')?'Job details':pathname.startsWith('/companies/')?'Company profile':'Jooblie','Explore opportunities and employers on Jooblie.'];document.title=item[0]+' | Jooblie';const changes=[];function meta(name,content,property=false){let node=document.head.querySelector('meta['+(property?'property':'name')+'="'+name+'"]');if(!node){node=document.createElement('meta');node.setAttribute(property?'property':'name',name);document.head.append(node);changes.push(node);}node.content=content;}meta('description',item[1]);meta('robots',privatePage?'noindex,nofollow':search||['/terms','/privacy','/privacy-policy'].includes(pathname)?'noindex,follow':'index,follow');meta('og:title',document.title,true);meta('og:description',item[1],true);meta('og:type','website',true);const base=import.meta.env.VITE_PUBLIC_SITE_URL;if(base){const url=new URL(pathname,base).href;meta('og:url',url,true);let canonical=document.createElement('link');canonical.rel='canonical';canonical.href=url;document.head.append(canonical);changes.push(canonical);}return()=>changes.forEach(node=>node.remove());},[pathname,search]);return null}
