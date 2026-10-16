import test from 'node:test';
import assert from 'node:assert/strict';
// These placeholder credentials exist only in this test worker; no remote requests are made.
process.env.SUPABASE_URL='http://127.0.0.1:1';
process.env.SUPABASE_ANON_KEY='test-only-anonymous-placeholder';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only-service-placeholder';
const {serviceDb}=await import('../src/config/supabase.js');
const admin=await import('../src/controllers/admin.controller.js');
const {requireRole}=await import('../src/middleware/auth.js');
function mock(results){
  const calls=[];serviceDb.from=table=>{const log=[['from',table]];calls.push(log);const result=results[calls.length-1]||{data:[],count:0};const query={};for(const name of ['select','order','eq','is','ilike','or','range','limit','update'])query[name]=(...args)=>{log.push([name,...args]);return query;};query.maybeSingle=()=>Promise.resolve(result);query.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return query;};return calls;
}
const run=(handler,req={})=>new Promise((resolve,reject)=>handler({query:{},params:{},body:{},user:{id:'actor'},...req},{json:resolve},reject));
test('admin user search, role, status, sorting and pagination apply before database range',async()=>{
  const calls=mock([{data:[{id:'beyond-100'}],count:125}]);
  const data=await run(admin.listUsers,{query:{search:'kashif',role:'recruiter',status:'active',sort:'email',direction:'asc',page:'6',limit:'20'}});
  assert.equal(data.pagination.total,125);assert.equal(data.pagination.page,6);
  assert.deepEqual(calls[0].at(-1),['range',100,119]);
  assert.ok(calls[0].some(call=>call[0]==='or'&&call[1].includes('email.ilike.%kashif%')));
  assert.ok(calls[0].some(call=>call[0]==='eq'&&call[1]==='role'&&call[2]==='recruiter'));
  assert.ok(calls[0].some(call=>call[0]==='eq'&&call[1]==='status'&&call[2]==='active'));
});
test('admin job listing excludes soft deleted records and filters pending queue on server',async()=>{
  const calls=mock([{data:[],count:0}]);await run(admin.listJobs,{query:{status:'pending_review',siteId:'3'}});
  assert.ok(calls[0].some(call=>call[0]==='is'&&call[1]==='deleted_at'&&call[2]===null));
  assert.ok(calls[0].some(call=>call[0]==='eq'&&call[1]==='status'&&call[2]==='pending_review'));
  assert.ok(calls[0].some(call=>call[0]==='eq'&&call[1]==='origin_site_id'&&call[2]===3));
});
test('failed dashboard metrics remain unavailable rather than zero',async()=>{
  mock([{error:{message:'offline'}},...Array.from({length:13},()=>({data:[],count:0}))]);
  const data=await run(admin.dashboard);assert.equal(data.metrics.users,null);assert.equal(data.metrics.jobs,0);assert.ok(data.unavailable.includes('users'));
});
test('portal metrics preserve failed counts and exclude deleted job mappings',async()=>{
  const calls=mock([{data:[{id:1,name:'Actual portal',is_active:false}],count:1},{error:{message:'failed'}},{count:0},{data:[]}]);
  const data=await run(admin.listPortals);assert.equal(data.items[0].metrics.jobs,null);assert.equal(data.items[0].metrics.users,0);assert.equal(data.items[0].is_active,false);
  assert.ok(calls[1].some(call=>call[0]==='is'&&call[1]==='jobs.deleted_at'));
});
test('same-role requests make no update and stale role changes return a conflict',async()=>{
  for(const [body,conflict]of [[{role:'recruiter',previous_role:'recruiter'},false],[{role:'job_seeker',previous_role:'admin'},true]]){
    const calls=mock([{data:{id:'target',role:'recruiter'}}]);
    const promise=run(admin.changeUserRole,{body,params:{userId:'target'}});
    if(conflict)await assert.rejects(promise,error=>error.status===409);else assert.equal((await promise).profile.role,'recruiter');
    assert.equal(calls.length,1);assert.ok(!calls.flat().some(call=>call[0]==='update'));
  }
});
test('own administrator role cannot be removed',async()=>{
  const calls=mock([]);await assert.rejects(run(admin.changeUserRole,{user:{id:'actor'},params:{userId:'actor'},body:{role:'recruiter'}}),error=>error.code==='SELF_ROLE_CHANGE_BLOCKED');assert.equal(calls.length,0);
});
test('admin access is decided from the server profile rather than client body',()=>{
  for(const role of ['recruiter','job_seeker',null]){let denied;requireRole('admin')({profile:role?{role}:null,body:{role:'admin'}},{},error=>{denied=error;});assert.equal(denied.status,403);}
  let allowed=false;requireRole('admin')({profile:{role:'admin'}},{},error=>{assert.equal(error,undefined);allowed=true;});assert.equal(allowed,true);
});
