import test from 'node:test';
import assert from 'node:assert/strict';
import {updateAdminJob,changeAdminRole} from '../src/utils/adminMutations.js';
import {adminJobUpdateSchema} from '../src/schemas.js';
function database(result){const calls=[];return{calls,rpc:(name,args)=>{calls.push([name,args]);return{single:async()=>result};}};}
test('admin editing uses atomic revision guard and excludes immutable client payload fields',async()=>{
  const db=database({data:{id:'job'}});
  await updateAdminJob(db,{actorId:'actor',jobId:'job',body:{title:'Changed',expected_updated_at:'2026-10-16T10:00:00.123456+00:00',company_id:'untrusted',created_by:'someone'}});
  assert.deepEqual(db.calls,[['admin_update_portal_job',{p_actor_id:'actor',p_job_id:'job',p_expected_updated_at:'2026-10-16T10:00:00.123456+00:00',p_payload:{title:'Changed'}}]]);
  assert.equal(adminJobUpdateSchema.safeParse({title:'Changed',expected_updated_at:'2026-10-16T10:00:00.123456+00:00'}).success,true);
});
test('admin role changes use transactional routine and response excludes private profile fields',async()=>{
  const db=database({data:{id:'target',role:'recruiter',status:'active',email:'target@example.test',full_name:'Target',default_resume_path:'private'}});
  const result=await changeAdminRole(db,{actorId:'actor',userId:'target',role:'recruiter',previousRole:'job_seeker'});
  assert.equal(result.default_resume_path,undefined);assert.equal(db.calls[0][0],'admin_change_user_role');assert.equal(db.calls[0][1].p_previous_role,'job_seeker');
});
test('stale, unauthorized and unapplied migration errors never fall back to an unguarded write',async()=>{
  for(const [code,status]of [['40001',409],['42501',403],['PGRST202',503]]){
    const db=database({error:{code,message:'internal details'}});
    await assert.rejects(updateAdminJob(db,{actorId:'actor',jobId:'job',body:{}}),error=>error.status===status&&!error.message.includes('internal'));
    assert.equal(db.calls.length,1);
  }
});
