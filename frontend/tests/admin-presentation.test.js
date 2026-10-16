import test from 'node:test';
import assert from 'node:assert/strict';
import {safeWebsite,displayDate} from '../src/admin/utils/presentation.js';
import {notificationContent} from '../src/shared/lib/notificationPresentation.js';
test('portal website links accept only external HTTP URLs without credentials',()=>{
  assert.equal(safeWebsite('jooblie.com'),'https://jooblie.com/');
  for(const value of ['javascript:alert(1)','data:text/html,bad','https://user:pass@example.com','',null,'not a domain','/admin/users'])assert.equal(safeWebsite(value),null);
});
test('notifications link to role appropriate internal records, never payload URLs',()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const item={type:'job_pending_review',entity_type:'job',entity_id:id,data:{url:'https://evil.test',message:'A '.repeat(300)}};
  assert.equal(notificationContent(item,'admin').to,`/admin/jobs?jobId=${id}`);
  assert.equal(notificationContent(item,'job_seeker').to,`/dashboard/job-seeker/jobs/${id}`);
  assert.equal(notificationContent({...item,entity_id:'../../secrets'},'admin').to,null);
  assert.ok(notificationContent(item,'admin').message.length<=240);
  assert.equal(notificationContent({type:'other',data:{message:{private:'value'}}},'admin').message,'');
});
test('missing or invalid dates remain unavailable',()=>{
  assert.equal(displayDate(null),'—');assert.equal(displayDate('invalid'),'—');assert.notEqual(displayDate('2026-10-16T10:00:00Z'),'—');
});
