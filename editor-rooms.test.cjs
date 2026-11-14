const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const H=require('./editor-model.js');
const m=JSON.parse(fs.readFileSync('projects/room-areas.json','utf8'));
assert.deepEqual(H.validate(m),[]);
const before=JSON.stringify(m),rooms=H.roomGeometry(m,1),upper=H.roomGeometry(m,2);
function near(a,b){assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);}
const expected={
  'С/у':[1832,2207,4.043224],
  'Тамбур':[1164,2207,2.568948],
  'Техпомещение':[1171,2207,2.584397],
  'Холл и лестница':[4639,2014,9.342946],
  'Кладовая':[1732,2871,4.972572],
  'Спальня':[2671,2871,7.668441],
  'Кухня-гостиная':[3707,5712,21.174384]
};
assert.equal(rooms.length,7);
for(const room of rooms){const e=expected[room.name];assert.ok(e,room.name);assert.equal(room.width,e[0]);assert.equal(room.depth,e[1]);near(room.area,e[2]);}
assert.equal(upper.length,3);
near(upper.find(r=>r.name==='Спальня 1').area,13.369598);
near(upper.find(r=>r.name==='Спальня 2').area,13.318569);
const hall=upper.find(r=>r.name==='Холл');
near(hall.area,(4639*1339-3150*1200)/1e6);
assert.equal(hall.width,4639);assert.equal(hall.depth,1339);
assert.equal(JSON.stringify(m),before);
// Facade thickness and opening sizes must not alter internal floor areas.
const facade=H.clone(m);facade.house.facadeProjection=300;
assert.deepEqual(H.roomGeometry(facade,1),rooms);
const glazing=H.clone(m);glazing.openings.forEach(o=>{o.width=250;o.thickness=95;});
assert.deepEqual(H.roomGeometry(glazing,1),rooms);
// A moved partition transfers exactly its displacement times clear room depth.
const moved=H.clone(m),partition=moved.walls.find(w=>w.id==='store');partition.x1+=100;partition.x2+=100;
const movedRooms=H.roomGeometry(moved,1);
near(movedRooms.find(r=>r.name==='Кладовая').area,expected['Кладовая'][2]+.2871);
near(movedRooms.find(r=>r.name==='Спальня').area,expected['Спальня'][2]-.2871);
// Detect newly enclosed rooms without hardcoded original room rectangles.
const split=H.clone(m);
split.walls.push({id:'new-partition',name:'Новая перегородка',axis:'y',x1:7000,x2:7100,y1:70,y2:5782,floor:1,roof:'ceiling',exterior:false,height:0});
const divided=H.roomGeometry(split,1),kitchens=divided.filter(r=>r.name.startsWith('Кухня-гостиная'));
assert.equal(divided.length,8);assert.equal(kitchens.length,2);
near(kitchens.reduce((sum,r)=>sum+r.area,0),21.174384-.5712);
assert.deepEqual(kitchens.map(r=>r.width).sort((a,b)=>a-b),[1682,1925]);
split.walls.at(-1).y2=3000;
const connected=H.roomGeometry(split,1).filter(r=>r.name.startsWith('Кухня-гостиная'));
assert.equal(connected.length,1);near(connected[0].area,21.174384-.293);
// Labels stay inside actual free space, outside partitions and stair graphics.
for(const floor of [1,2])for(const r of H.roomGeometry(m,floor)){
 const b=r.labelBox;
 for(const w of m.walls.filter(w=>(w.floor===0||w.floor===floor)&&(floor===1||w.roof!=='low')))
  assert.ok(Math.min(b.x2,w.x2)<=Math.max(b.x1,w.x1)||Math.min(b.y2,w.y2)<=Math.max(b.y1,w.y1));
 const st=m.stair;
 assert.ok(Math.min(b.x2,st.x+st.length)<=Math.max(b.x1,st.x)||Math.min(b.y2,st.y+st.width)<=Math.max(b.y1,st.y));
}
const scope={HouseModel:H};vm.runInNewContext(fs.readFileSync('editor-drawings.js','utf8'),{window:scope});
for(const floor of [1,2]){
 const svg=scope.HouseDrawings.draw(m,'plan'+floor,null),count=floor===1?7:3;
 assert.equal((svg.match(/data-room-area=/g)||[]).length,count);
 assert.equal((svg.match(/data-room-width=/g)||[]).length,count);
 assert.equal((svg.match(/data-room-depth=/g)||[]).length,count);
 assert.ok(svg.includes('м²'));assert.ok(!/NaN|undefined|Infinity/.test(svg));
}
console.log('Passed both floor areas, clear wall distances, stair void exclusion, moved/added partitions, label placement and SVG measurements.');
