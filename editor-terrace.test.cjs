const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const H=require('./editor-model.js'),T=require('./vendor/three.min.js');
const legacy=JSON.parse(fs.readFileSync('projects/room-areas.json','utf8')),before=JSON.stringify(legacy);
const model=H.canonical(legacy),g=H.terraceGeometry(model);
function near(a,b){assert.ok(Math.abs(a-b)<1e-5,`${a} != ${b}`);}
assert.equal(JSON.stringify(legacy),before);assert.deepEqual(H.validate(model),[]);
for(const key of ['house','walls','openings','stair'])assert.deepEqual(model[key],legacy[key]);
assert.equal(model.colors.terraceGlazing,'#474a51');assert.equal(g.p.enabled,true);
assert.equal(g.posts.length,2);near(g.area,6.736406);
near((g.door.a+g.door.b)/2,model.house.width-1100);
assert.ok(g.door.a>=model.house.width-2000&&g.door.b<=model.house.width-200);
assert.ok(g.door.a-60>=g.posts[0].x2&&g.door.b+60<=g.posts[1].x1);
for(const surface of g.surfaces){
 const slope=(surface.top(surface.b)-surface.top(surface.a))/(surface.b-surface.a);
 near(slope,surface.axis==='x'?-model.house.kitchenRise/(model.house.width-model.house.split):0);
}
for(const fields of [{doorOffset:0},{doorWidth:1800},{doorHeight:2800},{frameDepth:0},{glassOpacity:1},{enabled:'true'}]){
 const invalid=H.clone(model);Object.assign(invalid.terrace,fields);assert.throws(()=>H.canonical(invalid));
}
assert.deepEqual(H.canonical(JSON.parse(JSON.stringify(model))),model);
const resized=H.resizeHouse(model,{width:5000,split:2819.4});assert.deepEqual(H.validate(resized),[]);
let scene;
T.WebGLRenderer=class{constructor(){this.shadowMap={};this.domElement={addEventListener(){},remove(){}};}setPixelRatio(){}setSize(){}dispose(){}render(s){scene=s;s.updateMatrixWorld(true);}};
T.OrbitControls=class{constructor(){this.target=new T.Vector3();}addEventListener(){}update(){}dispose(){}};
const scope={THREE:T,HouseModel:H};
const ctx=vm.createContext({window:scope,THREE:T,devicePixelRatio:1,ResizeObserver:class{observe(){}disconnect(){}}});
vm.runInContext(fs.readFileSync('editor-3d.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('editor-drawings.js','utf8'),ctx);
const view=scope.createHouseView({appendChild(){},clientWidth:1000,clientHeight:700},()=>{});
function meshes(){const out=[];scene.traverse(o=>{if(o.isMesh)out.push(o);});return out;}
function points(mesh){const p=mesh.geometry.attributes.position;return Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld));}
function checkRoof(m){
 view.update(m);const all=meshes(),enclosure=all.filter(o=>o.userData.entity?.type==='terrace');
 assert.ok(enclosure.length);assert.equal(all.filter(o=>o.userData.part==='terrace-post').length,2);
 for(const mesh of enclosure){
  assert.equal('#'+mesh.material.color.clone().convertLinearToSRGB().getHexString(),m.colors.terraceGlazing);
  for(const p of points(mesh))assert.ok(p.y<=(H.lowTop(m,p.x*1000)-19.9)/1000,'Glazing penetrates roof');
  if(mesh.material.transparent){assert.equal(mesh.material.opacity,m.terrace.glassOpacity);assert.equal(mesh.castShadow,false);}
 }
 return enclosure;
}
const enclosure=checkRoof(model);
const posts=meshes().filter(o=>o.userData.part==='terrace-post');
for(let i=0;i<2;i++){
 const b=new T.Box3().setFromObject(posts[i]);near(b.min.x,g.posts[i].x1/1000);near(b.min.z,g.posts[i].y1/1000);
 near(b.max.x-b.min.x,.15);near(b.max.z-b.min.z,.15);
 for(const p of points(posts[i]))if(p.y>1)near(p.y,H.lowTop(model,p.x*1000)/1000);
}
// A door leaf, not another fixed pane, occupies the entrance opposite the stairs.
const origin=new T.Vector3((g.door.a+g.door.b)/2000,(g.floor+1000)/1000,(model.house.depth+200)/1000);
const ray=new T.Raycaster(origin,new T.Vector3(0,0,-1),0,.5);
const hits=ray.intersectObjects(enclosure);assert.ok(hits.length);
assert.ok(hits.every(h=>h.object.userData.part==='terrace-door-glass'));
const threshold=meshes().find(o=>o.userData.part==='terrace-door-threshold');
near(new T.Box3().setFromObject(threshold).max.y-new T.Box3().setFromObject(threshold).min.y,.02);
assert.ok(new T.Box3().setFromObject(meshes().find(o=>o.userData.part==='terrace-door-handle')).max.z>model.house.depth/1000);
const pitched=H.clone(model);pitched.house.kitchenRise=1000;checkRoof(pitched);
const open=H.clone(model);open.terrace.enabled=false;view.update(open);
assert.equal(meshes().filter(o=>o.userData.entity?.type==='terrace').length,0);assert.equal(meshes().filter(o=>o.userData.part==='terrace-post').length,2);
view.dispose();
for(const kind of ['plan1','plan2','back','right']){
 const svg=scope.HouseDrawings.draw(model,kind,{type:'terrace',id:'terrace'});
 assert.ok(!/NaN|undefined|Infinity/.test(svg));
 if(kind==='plan1'||kind==='back')assert.ok(svg.includes('data-terrace-entry="true"'));
 if(kind==='plan1')assert.ok(svg.includes('data-terrace-area="6.736406"'));
}
(async()=>{
 const elements=new Map(),storage=new Map([['dom-9x8-editor-v1',JSON.stringify(legacy)]]);let inputs=[],focused=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{style:{},value:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},querySelector(){return {style:{}};},querySelectorAll(){return id==='properties'?inputs:[];}});return elements.get(id);};
 const ui={HouseModel:H};
 const environment=vm.createContext({window:ui,document:{getElementById:el,querySelectorAll(){return [];}},URL,location:{href:'https://koopin66.github.io/dom-9x8/?object=terrace'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout(){return 1;},clearTimeout(){},console,createHouseView(){return {update(){},select(){},setMode(){},focusTerrace(){focused++;}};}});
 vm.runInContext(fs.readFileSync('editor-drawings.js','utf8'),environment);environment.HouseDrawings=ui.HouseDrawings;
 await vm.runInContext(fs.readFileSync('editor.js','utf8'),environment);
 assert.equal(ui.houseEditor.getSelection().type,'terrace');assert.equal(focused,1);
 for(const key of ['enabled',...Object.keys(H.terraceLimits)])assert.ok(el('properties').innerHTML.includes('name="'+key+'"'),key);
 const values={...model.terrace,doorWidth:800,frameDepth:80,glassOpacity:.45};
 function fields(enabled){inputs=Object.entries({...values,enabled}).map(([name,value])=>({name,type:name==='enabled'?'select-one':'number',value:String(name==='glassOpacity'?value*100:value),checkValidity(){return true;}}));}
 fields(true);el('properties').listeners.change();
 assert.deepEqual(JSON.parse(JSON.stringify(ui.houseEditor.snapshot().terrace)),values);
 const customized=JSON.parse(JSON.stringify(ui.houseEditor.snapshot()));
 fields(false);el('properties').listeners.change();
 assert.equal(ui.houseEditor.snapshot().terrace.enabled,false);assert.equal(JSON.parse(storage.get('dom-9x8-editor-v1')).terrace.glassOpacity,.45);
 el('undo').onclick();assert.deepEqual(JSON.parse(JSON.stringify(ui.houseEditor.snapshot())),customized);
 el('redo').onclick();assert.equal(ui.houseEditor.snapshot().terrace.enabled,false);
 console.log('Passed roof-parallel terrace glazing, clear stair-side glass door, two preserved posts, RAL 7024, transparency, area, resize, controls, JSON and undo/redo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
