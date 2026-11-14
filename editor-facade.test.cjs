const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const H=require('./editor-model.js');
const T=require('./vendor/three.min.js');
let scene;
T.WebGLRenderer=class {
  constructor(){this.shadowMap={};this.domElement={addEventListener(){},remove(){}};}
  setPixelRatio(){} setSize(){} dispose(){}
  render(value){scene=value;scene.updateMatrixWorld(true);}
};
T.OrbitControls=class {
  constructor(){this.target=new T.Vector3();}
  addEventListener(){} update(){} dispose(){}
};
const window={THREE:T,HouseModel:H};
const context=vm.createContext({window,THREE:T,devicePixelRatio:1,ResizeObserver:class{observe(){}disconnect(){}}});
vm.runInContext(fs.readFileSync('./editor-3d.js','utf8'),context);
vm.runInContext(fs.readFileSync('./editor-drawings.js','utf8'),context);
const view=window.createHouseView({appendChild(){},clientWidth:1000,clientHeight:700},()=>{});
const model=H.clone(H.initial);
view.update(model);
function meshes(type,id){const result=[];scene.traverse(o=>{if(o.isMesh&&o.userData.entity?.type===type&&(!id||o.userData.entity.id===id))result.push(o);});return result;}
function bounds(objects){const b=new T.Box3();objects.forEach(o=>b.expandByObject(o));return b;}
function near(actual,expected){assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);}
function checkFullOpenings(model){
  view.update(model);
  for(const o of model.openings.filter(o=>o.kind==='window'||o.kind==='glazedDoor')){
    const g=H.openingGeometry(model,o),face=H.openingFace(model,g.w);
    const sign=['left','front','kf'].includes(g.w.id)?-1:1;
    for(const across of [.05,.25,.5,.75,.95])for(const up of [.05,.25,.5,.75,.95]){
      const u=g.a+o.width*across,z=g.sill+(g.head(u)-g.sill)*up;
      const origin=new T.Vector3(g.w.axis==='x'?u/1000:(face+sign*500)/1000,z/1000,g.w.axis==='x'?(face+sign*500)/1000:u/1000);
      const direction=g.w.axis==='x'?new T.Vector3(0,0,-sign):new T.Vector3(-sign,0,0);
      const hits=new T.Raycaster(origin,direction,0,.8).intersectObjects(meshes('wall'));
      assert.equal(hits.length,0,`Wall covers ${o.id} at ${across}, ${up}`);
    }
  }
}
const envelope=bounds(meshes('wall'));
near(envelope.min.x,-.121);near(envelope.min.z,-.121);
near(envelope.max.x,9.121);near(envelope.max.z,8.121);
for(const o of model.openings.filter(o=>o.kind==='window'||o.kind==='glazedDoor')){
  const b=bounds(meshes('opening',o.id)),w=model.walls.find(w=>w.id===o.wallId),axis=w.axis==='x'?'z':'x';
  near(b.max[axis]-b.min[axis],.07);
  const ax=H.wallAxis(w),start=ax.start+o.offset+o.width/2;
  const face=H.openingFace(model,w),sign=['left','front','kf'].includes(w.id)?-1:1;
  const oldFace=sign<0?ax.lo:ax.hi;
  const layerLo=Math.min(oldFace,face)/1000,layerHi=Math.max(oldFace,face)/1000;
  // Independent measured bounds: a 70 mm frame sits entirely in the added
  // 121 mm wall, leaving exactly 25.5 mm on each side.
  near(b.min[axis]-layerLo,.0255);near(layerHi-b.max[axis],.0255);
  // The added facade must leave the full opening clear through the wall.
  const origin=new T.Vector3(w.axis==='x'?start/1000:(face+sign*500)/1000,
    (H.floorZ(model,o.floor)+o.sill+o.height/2)/1000,w.axis==='x'?(face+sign*500)/1000:start/1000);
  const direction=w.axis==='x'?new T.Vector3(0,0,-sign):new T.Vector3(-sign,0,0);
  const ray=new T.Raycaster(origin,direction,0,.8);
  assert.equal(ray.intersectObjects(meshes('wall',w.id)).length,0,`Blocked window ${o.id}`);
}
const changed=model.openings.find(o=>o.kind==='window');changed.thickness=95;
view.update(model);
const w=model.walls.find(w=>w.id===changed.wallId),b=bounds(meshes('opening',changed.id)),axis=w.axis==='x'?'z':'x';
near(b.max[axis]-b.min[axis],.095);
const changedAxis=H.wallAxis(w),changedSign=['left','front','kf'].includes(w.id)?-1:1;
const changedOldFace=changedSign<0?changedAxis.lo:changedAxis.hi;
near((b.min[axis]+b.max[axis])/2,(changedOldFace+changedSign*60.5)/1000);
const resized=H.resizeHouse(model,{width:10000,depth:8500,split:5638.9,kitchenDepth:6375});
view.update(resized);
const resizedEnvelope=bounds(meshes('wall'));
near(resizedEnvelope.min.x,-.121);near(resizedEnvelope.max.x,10.121);
near(resizedEnvelope.min.z,-.121);near(resizedEnvelope.max.z,8.621);
const old=H.clone(H.initial);delete old.house.facadeProjection;old.openings.forEach(o=>delete o.thickness);
const migrated=H.canonical(old);assert.equal(migrated.house.facadeProjection,121);
assert.ok(migrated.openings.every(o=>o.thickness===70));
assert.deepEqual(H.canonical(JSON.parse(JSON.stringify(model))),model);
for(const value of [null,-1,301,'70',Infinity]){
 const invalid=H.clone(model);invalid.openings[0].thickness=value;assert.throws(()=>H.canonical(invalid));
}
for(const name of ['plan1','plan2','front','back','left','right','section']){
 const svg=window.HouseDrawings.draw(model,name,null);assert.ok(!/NaN|undefined/.test(svg));
 if(name==='plan1'){assert.ok(svg.includes('9 242'));assert.ok(svg.includes('121 мм'));}
 if(name==='plan1'||name==='plan2'){
  const floor=name==='plan1'?1:2;
  for(const o of model.openings.filter(o=>o.floor===floor&&(o.kind==='window'||o.kind==='glazedDoor'))){
   const wall=model.walls.find(w=>w.id===o.wallId),ax=H.wallAxis(wall);
   const sign=['left','front','kf'].includes(wall.id)?-1:1;
   const center=(sign<0?ax.lo:ax.hi)+sign*60.5;
   const tag=svg.match(new RegExp('<rect[^>]*data-window-frame="'+o.id+'"[^>]*>'))?.[0];
   assert.ok(tag,`Missing plan frame ${o.id}`);
   const value=key=>Number(tag.match(new RegExp(key+'="([^"]+)"'))[1]);
   near(value(wall.axis==='x'?'y':'x'),center-o.thickness/2);
   near(value(wall.axis==='x'?'height':'width'),o.thickness);
  }
 }
}
model.house.facadeProjection=0;view.update(model);near(bounds(meshes('wall')).min.x,0);
checkFullOpenings(H.initial);
const screenshot=H.clone(H.initial),bedroom=screenshot.openings.find(o=>o.id==='o14');
Object.assign(bedroom,{width:1400,height:1700,offset:2757,thickness:70});
assert.deepEqual(H.validate(screenshot),[]);
checkFullOpenings(screenshot);
view.dispose();
console.log('Passed windows centered inside 121 mm facade in 3D and plans, exact 70/95 mm thickness, clear openings, resizing and JSON compatibility.');
