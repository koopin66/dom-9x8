const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const H=require('./editor-model.js'),T=require('./vendor/three.min.js');
const legacy=JSON.parse(fs.readFileSync('projects/room-areas.json','utf8'));
const migrated=H.canonical(legacy);
assert.equal(migrated.porch.roofAngle,15);assert.equal(migrated.porch.roofWidth,legacy.porch.width+150);
const unchanged=H.clone(migrated);unchanged.porch=legacy.porch;assert.deepEqual(unchanged,legacy);
const model=H.clone(migrated);
Object.assign(model.porch,{roofWidth:2200,roofDepth:1600,roofAngle:20,roofHeight:3100,roofThickness:90,roofOffsetX:100});
assert.deepEqual(H.validate(model),[]);
assert.deepEqual(H.canonical(JSON.parse(JSON.stringify(model))),model);
assert.deepEqual(H.roomGeometry(model,1),H.roomGeometry(migrated,1));
for(const fields of [{roofAngle:46},{roofAngle:-1},{roofAngle:'15'},{roofWidth:null},{roofWidth:20001},{roofDepth:0},{roofOffsetX:5000},{roofThickness:10},{roofHeight:2100,roofDepth:5000,roofAngle:45}]){
 const invalid=H.clone(model);Object.assign(invalid.porch,fields);assert.throws(()=>H.canonical(invalid));
}
const narrow=H.clone(migrated);narrow.porch.roofWidth=600;narrow.porch.roofDepth=300;assert.deepEqual(H.validate(narrow),[]);
const deepLegacy=H.clone(legacy);deepLegacy.porch.depth=3000;deepLegacy.house.ceiling=2200;
assert.deepEqual(H.validate(deepLegacy),[]);
assert.ok(H.porchRoofGeometry(H.canonical(deepLegacy)).bottom(-3125)>=1800);
const thickFacade=H.clone(legacy);thickFacade.house.facadeProjection=1200;thickFacade.porch.depth=300;
assert.deepEqual(H.validate(thickFacade),[]);assert.doesNotThrow(()=>H.canonical(thickFacade));
// Measure the actual Three.js mesh, including the slope and normal thickness.
let scene;
T.WebGLRenderer=class{constructor(){this.shadowMap={};this.domElement={addEventListener(){},remove(){}};}setPixelRatio(){}setSize(){}dispose(){}render(s){scene=s;s.updateMatrixWorld(true);}};
T.OrbitControls=class{constructor(){this.target=new T.Vector3();}addEventListener(){}update(){}dispose(){}};
const scope={THREE:T,HouseModel:H};
const ctx=vm.createContext({window:scope,THREE:T,devicePixelRatio:1,ResizeObserver:class{observe(){}disconnect(){}}});
vm.runInContext(fs.readFileSync('editor-3d.js','utf8'),ctx);
const view=scope.createHouseView({appendChild(){},clientWidth:900,clientHeight:700},()=>{});view.update(model);
const roof=[],posts=[];scene.traverse(o=>{if(o.userData.part==='porch-roof')roof.push(o);if(o.userData.part==='porch-post')posts.push(o);});
assert.equal(roof.length,1);assert.equal(posts.length,2);assert.equal(roof[0].userData.entity.type,'porch');
function near(a,b){assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);}
function points(mesh){const values=mesh.geometry.attributes.position;return Array.from({length:values.count},(_,i)=>new T.Vector3().fromBufferAttribute(values,i).applyMatrix4(mesh.matrixWorld));}
const vertices=points(roof[0]),box=new T.Box3().setFromObject(roof[0]);
near(box.max.x-box.min.x,2.2);near(box.max.z-box.min.z,1.6);
const back=vertices.filter(p=>Math.abs(p.z+.121)<1e-6),front=vertices.filter(p=>Math.abs(p.z+1.721)<1e-6);
const backBottom=Math.min(...back.map(p=>p.y)),frontBottom=Math.min(...front.map(p=>p.y));
near(backBottom,3.1);near((backBottom-frontBottom)/1.6,Math.tan(20*Math.PI/180));
near((Math.max(...back.map(p=>p.y))-backBottom)*Math.cos(20*Math.PI/180),.09);
for(const post of posts)for(const p of points(post).filter(p=>p.y>1))near(p.y,3.1+(p.z+.121)*Math.tan(20*Math.PI/180));
view.setMode('open',false);assert.equal(roof[0].parent.visible,false);view.setMode('all',false);view.focusPorch();assert.equal(roof[0].parent.visible,true);
view.dispose();
// Test real inspector input, browser persistence, undo and redo.
(async()=>{
 const elements=new Map(),storage=new Map([['dom-9x8-editor-v1',JSON.stringify(legacy)]]);let inputs=[],focusCount=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{style:{},value:'',listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},querySelector(){return {style:{}};},querySelectorAll(){return id==='properties'?inputs:[];}});return elements.get(id);};
 const ui={HouseModel:H};
 const environment=vm.createContext({window:ui,document:{getElementById:el,querySelectorAll(){return [];}},URL,location:{href:'https://koopin66.github.io/dom-9x8/?object=porch'},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout(){return 1;},clearTimeout(){},console,createHouseView(){return {update(){},select(){},setMode(){},focusPorch(){focusCount++;}};}});
 vm.runInContext(fs.readFileSync('editor-drawings.js','utf8'),environment);environment.HouseDrawings=ui.HouseDrawings;
 await vm.runInContext(fs.readFileSync('editor.js','utf8'),environment);
 assert.equal(ui.houseEditor.getSelection().type,'porch');assert.equal(focusCount,1);
 for(const key of Object.keys(H.porchLimits))assert.ok(el('properties').innerHTML.includes('name="'+key+'"'),key);
 inputs=Object.entries(model.porch).map(([name,value])=>({name,type:'number',value:String(value),checkValidity(){return true;}}));
 el('properties').listeners.change();
 assert.deepEqual(JSON.parse(JSON.stringify(ui.houseEditor.snapshot().porch)),model.porch);
 assert.deepEqual(JSON.parse(storage.get('dom-9x8-editor-v1')).porch,model.porch);
 assert.equal(el('error').hidden,true);
 el('undo').onclick();assert.deepEqual(JSON.parse(JSON.stringify(ui.houseEditor.snapshot().porch)),migrated.porch);
 el('redo').onclick();assert.deepEqual(JSON.parse(JSON.stringify(ui.houseEditor.snapshot().porch)),model.porch);
 for(const kind of ['plan1','front','left','right']){
  const svg=ui.HouseDrawings.draw(model,kind,{type:'porch',id:'porch'});
  assert.ok(kind==='plan1'||kind==='front'?svg.includes('Козырёк'):svg.includes('data-porch-roof-angle="20"'));assert.ok(!/NaN|undefined|Infinity/.test(svg));
 }
 console.log('Passed canopy slope/thickness/support geometry, independent dimensions, legacy JSON, validation, inspector editing, persistence and undo/redo.');
})().catch(e=>{console.error(e);process.exitCode=1;});
