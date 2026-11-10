// Regression checks for a shared editable model and atomic JSON loading.
const assert=require('node:assert/strict');
const H=require('./editor-model.js');
assert.deepEqual(H.validate(H.initial),[]);
const resized=H.resizeHouse(H.initial,{width:10000,depth:8500,split:5638.9,kitchenDepth:6375});
assert.deepEqual(H.validate(resized),[]);
assert.equal(resized.walls.find(w=>w.id==='right').x2,10000);
assert.equal(resized.walls.find(w=>w.id==='left').y2,8500);
for(const opening of resized.openings){
  const g=H.openingGeometry(resized,opening);
  assert.ok(g.a>=g.ax.start&&g.b<=g.ax.end+.1);
}
const changed=H.clone(H.initial),opening=changed.openings.find(o=>o.wallId==='right');
opening.width=1400;opening.sill=450;opening.height=1750;
assert.deepEqual(H.validate(changed),[]);
const geometry=H.openingGeometry(changed,opening);
assert.equal(geometry.b-geometry.a,1400);assert.equal(geometry.sill,450);assert.equal(geometry.head(geometry.a),2200);
opening.width=20000;assert.ok(H.validate(changed).some(e=>e.includes('проём')));
assert.throws(()=>H.canonical(changed));
const overlap=H.clone(H.initial);overlap.openings.push({...overlap.openings[0],id:'other'});
assert.ok(H.validate(overlap).some(e=>e.includes('пересекается')));
const above=H.clone(H.initial);above.openings[0].height=9000;
assert.ok(H.validate(above).some(e=>e.includes('ниже верха')));
assert.deepEqual(H.canonical(JSON.parse(JSON.stringify(resized))),resized);
const poisoned=H.clone(H.initial);poisoned.untrusted='ignore';
assert.equal(H.canonical(poisoned).untrusted,undefined);
assert.throws(()=>H.canonical({schema:'other'}));
console.log('Passed shared geometry, resizing, invalid dimensions, overlapping openings and JSON round-trip.');
