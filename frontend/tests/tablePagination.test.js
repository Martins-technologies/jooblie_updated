import test from 'node:test';
import assert from 'node:assert/strict';
import {tablePageTokens} from '../src/shared/lib/tablePagination.js';
test('table pagination shows first, current neighbourhood and last without duplicated pages',()=>{
  assert.deepEqual(tablePageTokens(1,31),[1,2,3,'gap-3',31]);
  assert.deepEqual(tablePageTokens(16,31),[1,'gap-1',15,16,17,'gap-17',31]);
  assert.deepEqual(tablePageTokens(31,31),[1,'gap-1',29,30,31]);
});
test('small, empty, invalid and out-of-range page values remain usable',()=>{
  assert.deepEqual(tablePageTokens(1,0),[1]);
  assert.deepEqual(tablePageTokens(99,5),[1,2,3,4,5]);
  assert.deepEqual(tablePageTokens(-1,3),[1,2,3]);
  assert.deepEqual(tablePageTokens(Infinity,Infinity),[1]);
  assert.deepEqual(tablePageTokens(NaN,NaN),[1]);
});
