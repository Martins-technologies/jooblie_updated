import test from 'node:test';
import assert from 'node:assert/strict';
import {csvCell,jobsCsv,loadExportJobs} from '../src/admin/utils/jobsExport.js';

test('job CSV escapes multiline/quoted values and neutralizes spreadsheet formulas',()=>{
  assert.equal(csvCell('A,"B"\nC'),'"A,""B""\nC"');
  for(const text of ['=SUM(A1)',' +1','-2','@link','\t=cmd']) assert.ok(csvCell(text).startsWith('"\''));
  const csv=jobsCsv([{id:'1',title:'Designer',companies:null,sites:{name:'Jooblie'}}]);
  assert.ok(csv.includes('"Job ID","Job title","Company"'));
  assert.ok(csv.includes('"1","Designer","","Jooblie"'));
});
test('all-filtered export preserves scope and sort, fetches every page and ignores displayed page size',async()=>{
  const calls=[];
  const rows=await loadExportJobs(async path=>{
    const params=new URL(path,'https://example.test').searchParams;calls.push(params);
    const page=Number(params.get('page'));
    return {items:Array.from({length:page===1?100:1},(_,i)=>({id:String((page-1)*100+i)})),pagination:{total:101}};
  },new URLSearchParams('page=8&limit=10&status=active&siteId=2&search=engineer&sort=title&direction=asc'));
  assert.equal(rows.length,101);assert.equal(calls.length,2);
  for(const params of calls){assert.equal(params.get('limit'),'100');assert.equal(params.get('status'),'active');assert.equal(params.get('siteId'),'2');assert.equal(params.get('search'),'engineer');assert.equal(params.get('sort'),'title');}
});
test('export fails visibly for incomplete, changing, oversized or malformed datasets',async()=>{
  for(const result of [{items:[],pagination:{total:5}},{items:[],pagination:{total:10001}},{items:[]},{items:[{id:'1'},{id:'1'}],pagination:{total:2}}]){
    await assert.rejects(loadExportJobs(async()=>result,new URLSearchParams()));
  }
  let calls=0;
  await assert.rejects(loadExportJobs(async()=>({items:Array.from({length:100},(_,i)=>({id:String(i)})),pagination:{total:++calls===1?200:201}}),new URLSearchParams()),/changed/);
});
test('cancelled export sends no request',async()=>{
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(loadExportJobs(async()=>{calls++;},new URLSearchParams(),controller.signal),{name:'AbortError'});
  assert.equal(calls,0);
});
