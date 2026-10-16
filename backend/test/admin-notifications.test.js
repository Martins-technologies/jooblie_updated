import test from 'node:test';
import assert from 'node:assert/strict';
import { createNotificationHandlers } from '../src/controllers/notifications.controller.js';
import { adminQuery, optionalCount } from '../src/utils/adminQuery.js';

function database(results) {
  const calls=[];
  return { calls, from(table){const log=[['from',table]];calls.push(log);const result=results[calls.length-1] || {data:[],count:0};const query={};for(const method of ['select','eq','is','order','range','update','lte'])query[method]=(...args)=>{log.push([method,...args]);return query;};query.maybeSingle=()=>Promise.resolve(result);query.then=(resolve,reject)=>Promise.resolve(result).then(resolve,reject);return query;} };
}
function run(handler, overrides={}) {
  return new Promise((resolve,reject)=>handler({user:{id:'owner'},query:{},body:{},params:{notificationId:'11111111-1111-4111-8111-111111111111'},...overrides},{json:resolve},reject));
}
test('notification listing and unread count both scope service queries to authenticated owner',async()=>{
  const db=database([{data:[{id:'one'}],count:60},{count:4}]);
  const result=await run(createNotificationHandlers(db).list,{query:{page:'2',limit:'20',unread:'true',user_id:'someone-else'}});
  assert.equal(result.unread,4);assert.equal(result.pagination.total,60);
  assert.ok(db.calls.every(log=>log.some(call=>call[0]==='eq' && call[1]==='user_id' && call[2]==='owner')));
  assert.deepEqual(db.calls[0].find(call=>call[0]==='range'),['range',20,39]);
  assert.ok(db.calls[0].some(call=>call[0]==='is' && call[1]==='read_at'));
});
test('notification read/unread mutation only touches an owned ID and returns confirmed timestamp',async()=>{
  for(const read of [true,false]){
    const db=database([{data:{id:'record',read_at:read?'timestamp':null}}]);
    const response=await run(createNotificationHandlers(db).update,{body:{read,user_id:'other'}});
    const calls=db.calls[0];
    assert.ok(calls.some(call=>call[0]==='eq' && call[1]==='user_id' && call[2]==='owner'));
    assert.ok(calls.some(call=>call[0]==='eq' && call[1]==='id'));
    const data=calls.find(call=>call[0]==='update')[1];
    assert.equal(data.read_at===null,!read);assert.equal(response.notification.id,'record');
  }
});
test('unknown, foreign-owned and deleted notifications return a generic 404',async()=>{
  const db=database([{data:null}]);
  await assert.rejects(run(createNotificationHandlers(db).update,{body:{read:true}}),error=>error.status===404&&error.code==='NOTIFICATION_NOT_FOUND');
});
test('malformed notification references do not query the database',async()=>{
  const db=database([]);
  await assert.rejects(run(createNotificationHandlers(db).update,{params:{notificationId:'invalid'},body:{read:true}}),error=>error.status===400);
  assert.equal(db.calls.length,0);
});
test('mark all read protects other users and notifications newer than click cutoff',async()=>{
  const db=database([{data:null}]);const cutoff='2026-01-01T00:00:00.000Z';
  await run(createNotificationHandlers(db).readAll,{body:{before:cutoff}});
  const calls=db.calls[0];
  assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='user_id'&&call[2]==='owner'));
  assert.ok(calls.some(call=>call[0]==='is'&&call[1]==='read_at'&&call[2]===null));
  assert.deepEqual(calls.find(call=>call[0]==='lte'),['lte','created_at',cutoff]);
});
test('notification errors never report success or expose database errors',async()=>{
  for(const method of ['list','update','readAll']){
    const db=database([{error:{message:'secret query failure'}},{count:0}]);
    await assert.rejects(run(createNotificationHandlers(db)[method],{body:{read:true,before:'2026-01-01T00:00:00.000Z'}}),error=>error.status===500&&!error.message.includes('secret'));
  }
});
test('search input cannot inject PostgREST OR filters, sort is allowlisted and pages bounded',()=>{
  const query=adminQuery({search:'x),status.eq.admin,(%_*"',sort:'role;drop',direction:'asc',page:'-5',limit:'100000'},['full_name'],'full_name');
  assert.equal(query.sort,'full_name');assert.equal(query.limit,100);assert.equal(query.page,1);assert.equal(query.ascending,true);
  assert.doesNotMatch(query.search,/[(),%_*";]/);
  assert.equal(optionalCount({error:{message:'offline'}}),null);assert.equal(optionalCount({count:0}),0);
});
