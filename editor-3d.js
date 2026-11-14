/* Persistent WebGL view. All rebuilds consume the same HouseModel as the drawings. */
(function(global){
'use strict';
const H=global.HouseModel;
global.createHouseView=function(host,onSelect){
  if(!global.THREE)throw new Error('Не загружена библиотека 3D.');
  const T=global.THREE,renderer=new T.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputEncoding=T.sRGBEncoding;
  const clip=new T.Plane(new T.Vector3(0,-1,0),1000);
  renderer.clippingPlanes=[clip];host.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0xe4e8e5);
  let root,roofG,entity=null,currentModel,mode='all',selectionBox=null;
  const camera=new T.PerspectiveCamera(40,1,.1,200);
  camera.position.set(15.8,6.1,19.2);
  const controls=new T.OrbitControls(camera,renderer.domElement);
  controls.target.set(4.5,2.1,4);controls.maxPolarAngle=Math.PI*.495;
  controls.minDistance=3;controls.maxDistance=70;
  scene.add(new T.HemisphereLight(0xeef3f6,0x6d6a58,.78));
  const sun=new T.DirectionalLight(0xffffff,.82);sun.position.set(15,17,10);
  sun.target.position.set(4.5,0,4);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:1,far:80});sun.shadow.bias=-.0006;
  const render=()=>renderer.render(scene,camera);
  controls.addEventListener('change',render);
  const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85,metalness:0},o||{}));
  const mat={wall:M(0x64625e),wallIn:M(0xefebe3),roof:M(0x3d464b,{roughness:.55,metalness:.25}),seam:M(0x4d575c,{roughness:.5,metalness:.3}),
    plinth:M(0x8f9395),deck:M(0xa47750),wood:M(0x8a603f),glass:M(0x91a4b1,{transparent:true,opacity:.83,roughness:.24,metalness:.12}),
    sash:M(0x8e989a),frame:M(0xf3f1e9,{roughness:.6}),door:M(0x6b4a31),doorIn:M(0xe7dfd2),slab:M(0xcfc8ba),floor:M(0xcbb08a),ground:M(0xa6aa98,{roughness:1}),
    stair:M(0xb4895c),furn:M(0xc8c2b6),soft:M(0x8796a1),dark:M(0x5c6468)};
  // Continuous courses across wall pieces and around openings (local vertical units: mm).
  mat.wall.onBeforeCompile=shader=>{
    shader.vertexShader='varying float courseHeight;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ncourseHeight=position.y;');
    shader.fragmentShader='varying float courseHeight;\n'+shader.fragmentShader.replace('#include <color_fragment>',
      '#include <color_fragment>\nfloat h=mod(courseHeight,190.0); diffuseColor.rgb*=mix(.74,1.0,smoothstep(0.0,8.0,h))*(1.0+.035*(1.0-h/190.0));');
  };
  Object.values(mat).forEach(material=>material.color.convertSRGBToLinear());
  const edgeMat=new THREE.LineBasicMaterial({color:0x232b2f,transparent:true,opacity:.3});
  function add(mesh,parent,edges,shadow){
    parent=parent||root; mesh.userData.entity=entity; mesh.castShadow=shadow!==false; mesh.receiveShadow=true; parent.add(mesh);
    if(edges!==false){const e=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,25),edgeMat); e.position.copy(mesh.position); e.rotation.copy(mesh.rotation); parent.add(e);}
    return mesh;
  }
  const shape=pts=>{const sh=new THREE.Shape(); pts.forEach((p,i)=>i?sh.lineTo(p[0],p[1]):sh.moveTo(p[0],p[1])); return sh;};
  const prism=(pts,depth,m)=>new THREE.Mesh(new THREE.ExtrudeGeometry(shape(pts),{depth,bevelEnabled:false}),m);
  const box=(x1,y1,z1,x2,y2,z2,m)=>{const me=new THREE.Mesh(new THREE.BoxGeometry(x2-x1,z2-z1,y2-y1),m); me.position.set((x1+x2)/2,(z1+z2)/2,(y1+y2)/2); return me;};
  const place=(mesh,along,t0,t1)=>{if(along==='X'){mesh.position.z=t0;}else{mesh.rotation.y=-Math.PI/2; mesh.position.x=t1;} return mesh;};


  function disposeGroup(group){
    const geometries=new Set();
    group.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});
    geometries.forEach(g=>g.dispose());scene.remove(group);
  }
  function select(selection){
    if(selectionBox){scene.remove(selectionBox);selectionBox.geometry.dispose();selectionBox.material.dispose();selectionBox=null;}
    if(!selection||!root){render();return;}
    root.updateMatrixWorld(true);
    const bounds=new THREE.Box3();
    root.traverse(o=>{const e=o.userData.entity;if(o.isMesh&&e&&e.id===selection.id&&e.type===selection.type)bounds.expandByObject(o);});
    if(!bounds.isEmpty()){selectionBox=new THREE.Box3Helper(bounds,0x167d71);scene.add(selectionBox);}
    render();
  }
  function update(model){
    select(null);
    if(root)disposeGroup(root);
    const previous=currentModel?.house;
    if(previous&&(previous.width!==model.house.width||previous.depth!==model.house.depth)){
      const factor=Math.max(model.house.width,model.house.depth)/Math.max(previous.width,previous.depth);
      const offset=camera.position.clone().sub(controls.target).multiplyScalar(factor);
      controls.target.set(model.house.width/2000,controls.target.y,model.house.depth/2000);
      camera.position.copy(controls.target).add(offset);controls.update();
    }
    currentModel=model;
    root=new T.Group();root.scale.setScalar(.001);scene.add(root);
    roofG=new T.Group();root.add(roofG);
    const h=model.house,st=model.stair,p=model.porch;
    const high=x=>H.mainTop(model,x),low=x=>H.lowTop(model,x),f2=H.floorZ(model,2);
    const WALLS=[...model.walls,...H.facadeWalls(model)].map(w=>({...w,z0:w.baseHeight??H.floorZ(model,w.floor),ext:w.exterior,top:u=>H.wallTop(model,w,u)}));
    const OPEN=model.openings.map(o=>{
      const g=H.openingGeometry(model,o);
      return {...o,w:o.wallId,a:g.a,b:g.b,s:g.sill,h:g.head,cornerCoord:g.corner,t:({window:'win',glazedDoor:'slide',door:'door',passage:'open'})[o.kind]};
    });
    const K=v=>typeof v==='function'?v:()=>v;
    const wallAxis=w=>{const a=H.wallAxis(w);return {along:w.axis==='x'?'X':'Y',u0:a.start,u1:a.end,t0:a.lo,t1:a.hi};};
  for(const w of WALLS){
    entity={type:'wall',id:w.id};
    const ax=wallAxis(w), {along,u0,u1,t0,t1}=ax, tc=(t0+t1)/2;
    const ops=OPEN.filter(o=>o.w===w.id&&o.b>u0&&o.a<u1).map(o=>Object.assign({},o,{S:K(o.s),H:K(o.h)}));
    const bp=[...new Set([u0,u1,...ops.flatMap(o=>o.shape==='rake'?[o.a,o.cornerCoord,o.b]:[o.a,o.b]).filter(u=>u>u0&&u<u1)])].sort((a,b)=>a-b);
    const wm=w.ext?mat.wall:mat.wallIn;
    const piece=(p,q,bottom,top)=>{const Lo=u=>Math.max(w.z0,bottom(u)),Up=u=>Math.min(w.top(u),top(u));if(Up(p)-Lo(p)<2&&Up(q)-Lo(q)<2) return; add(place(prism([[p,Lo(p)],[q,Lo(q)],[q,Up(q)],[p,Up(p)]],t1-t0,wm),along,t0,t1),root,false);};
    for(let i=0;i<bp.length-1;i++){
      const p=bp[i],q=bp[i+1],m=(p+q)/2;
      const cov=ops.filter(o=>o.a<=p+1&&o.b>=q-1).sort((a,b)=>a.S(m)-b.S(m));
      let lo=()=>w.z0; cov.forEach(o=>{piece(p,q,lo,o.S); lo=o.H;}); piece(p,q,lo,w.top);
    }
    if(w.facade)continue;
    ops.forEach(o=>{
      entity={type:'opening',id:o.id};
      const pts=[[o.a,o.S(o.a)],[o.b,o.S(o.b)],[o.b,o.H(o.b)],[o.a,o.H(o.a)]];
      if(o.t==='win'||o.t==='slide'){
        const source=model.openings.find(item=>item.id===o.id);
        const {sign,face,thickness,center}=H.openingPlacement(model,source);
        const corners=o.shape==='rake'?[o.cornerCoord]:[];
        function polygon(a,b,bottom,top){
          return [[a,bottom],[b,bottom],...[a,...corners.filter(x=>x>a&&x<b),b].reverse().map(x=>[x,top(x)])];
        }
        function profile(points,depth,offset,material){
          add(place(prism(points,depth,material),along,offset-depth/2,offset+depth/2),root,false);
        }
        function ring(outer,inner,depth,offset,material){
          const outline=shape(outer), hole=new THREE.Path();
          inner.slice().reverse().forEach(([x,y],i)=>i?hole.lineTo(x,y):hole.moveTo(x,y));
          outline.holes.push(hole);
          const frame=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth,bevelEnabled:false}),material);
          add(place(frame,along,offset-depth/2,offset+depth/2),root,false);
        }
        const sill=o.S(o.a), casing=o.t==='slide'?62:52;
        const cut=polygon(o.a,o.b,sill,o.H);
        const trimDepth=Math.min(22,thickness);
        ring(polygon(o.a-casing,o.b+casing,sill-(o.t==='slide'?8:44),x=>o.H(x)+casing),cut,trimDepth,face-sign*trimDepth/2,mat.frame);
        const clear=polygon(o.a+45,o.b-45,sill+45,x=>o.H(x)-45);
        ring(cut,clear,thickness,center,mat.frame);
        const divisions=o.panels;
        const width=(o.b-o.a-90)/divisions;
        for(let k=0;k<divisions;k++){
          const a=o.a+45+k*width,b=a+width;
          const pane=polygon(a+21,b-21,sill+67,x=>o.H(x)-67);
          ring(polygon(a,b,sill+45,x=>o.H(x)-45),pane,thickness*.45,center+sign*thickness*.2,mat.sash);
          profile(pane,Math.min(12,thickness*.2),center,mat.glass);
        }
      } else if(o.t==='door'){
        add(place(prism(pts,44,w.ext?mat.frame:mat.doorIn),along,tc-22,tc+22),root,false);
      }
    });
  }


    entity=null;
    function solid(x,y,z,X,Y,Z,m,parent){
      if(X>x&&Y>y&&Z>z)add(box(x,y,z,X,Y,Z,m),parent,false);
    }
    solid(0,0,-h.base,h.split,h.depth,0,mat.plinth);
    solid(h.split,0,-h.base,h.width,h.kitchenDepth,0,mat.plinth);
    solid(h.split,h.kitchenDepth,-h.base,h.width,h.depth,-h.terraceDrop,mat.plinth);
    solid(h.split,h.kitchenDepth,-h.terraceDrop,h.width,h.depth,25-h.terraceDrop,mat.deck);
    // Four slabs surround the exact stair opening.
    const inside={left:model.walls.find(w=>w.id==='left')?.x2||0,
      right:model.walls.find(w=>w.id==='ridge')?.x1||h.split,
      front:model.walls.find(w=>w.id==='front')?.y2||0,
      back:model.walls.find(w=>w.id==='back')?.y1||h.depth};
    solid(inside.left,inside.front,h.ceiling,inside.right,st.y,f2,mat.slab);
    solid(inside.left,st.y+st.width,h.ceiling,inside.right,inside.back,f2,mat.slab);
    solid(inside.left,st.y,h.ceiling,st.x,st.y+st.width,f2,mat.slab);
    solid(st.x+st.length,st.y,h.ceiling,inside.right,st.y+st.width,f2,mat.slab);
    entity={type:'stair',id:'stair'};
    const run=st.length/(st.steps-1),rise=f2/st.steps;
    for(let i=0;i<st.steps-1;i++){
      const x=st.x+i*run,z=(i+1)*rise;
      solid(x,st.y,z-55,x+run,st.y+st.width,z,mat.stair);
    }
    entity=null;
    function roof(a,b,fn){
      const depth=h.depth+2*h.overhang;
      const layer=(lo,hi,material)=>{
        const panel=prism([[a,fn(a)+lo],[b,fn(b)+lo],[b,fn(b)+hi],[a,fn(a)+hi]],depth,material);
        panel.position.z=-h.overhang;add(panel,roofG,false);
      };
      layer(0,h.roofThickness*.82,mat.frame);layer(h.roofThickness*.82,h.roofThickness,mat.roof);
    }
    roof(-h.overhang,h.split+h.overhang,high);roof(h.split,h.width+h.overhang,low);
    const right=h.width-150,back=h.depth-150;
    for(const [x,y] of [[h.split+(h.width-h.split)*.49,back],[right,back]])
      solid(x,y,25-h.terraceDrop,x+150,y+150,low(x),mat.frame);
    entity={type:'porch',id:'porch'};
    solid(p.x,-p.depth,-h.base,p.x+p.width,0,0,mat.deck);
    const canopy=H.porchRoofGeometry(model);
    const roofPanel=prism([[canopy.y1,canopy.bottom(canopy.y1)],[canopy.y2,canopy.bottom(canopy.y2)],
      [canopy.y2,canopy.top(canopy.y2)],[canopy.y1,canopy.top(canopy.y1)]],canopy.x2-canopy.x1,mat.roof);
    roofPanel.userData.part='porch-roof';
    add(place(roofPanel,'Y',canopy.x1,canopy.x2),roofG,false);
    for(const x of [canopy.postLeft,canopy.postRight]){
      const y=canopy.postY;
      const post=prism([[y,0],[y+100,0],[y+100,canopy.bottom(y+100)],[y,canopy.bottom(y)]],100,mat.frame);
      post.userData.part='porch-post';add(place(post,'Y',x,x+100),root,false);
    }
    entity=null;
    for(let i=0;i<3;i++){
      solid(p.x,-p.depth-750+250*i,-h.base,p.x+p.width,-p.depth-500+250*i,-h.base+(i+1)*h.base/4,mat.deck);
      solid(h.width-2000,h.depth+500-250*i,-h.base,h.width-200,h.depth+750-250*i,-h.base+(i+1)*(h.base-h.terraceDrop+25)/4,mat.deck);
    }
    const ground=new T.Mesh(new T.PlaneGeometry(100000,100000),mat.ground);
    ground.rotation.x=-Math.PI/2;ground.position.set(h.width/2,-h.base-2,h.depth/2);ground.receiveShadow=true;root.add(ground);
    setMode(mode,false);render();
  }
  function setMode(value,reposition=true){
    mode=value;if(!root)return;
    roofG.visible=mode==='all';
    clip.constant=mode==='f1'?1.3:mode==='f2'?(H.floorZ(currentModel,2)+1200)/1000:1000;
    if(reposition){
      const h=currentModel.house,cx=h.width/2000,cz=h.depth/2000,size=Math.max(h.width,h.depth)/9000;
      const offsets=mode==='all'?[11.3,6.1,15.2]:[10,17,13];
      camera.position.set(cx+offsets[0]*size,offsets[1]*size,cz+offsets[2]*size);
      controls.target.set(cx,mode==='f2'?H.floorZ(currentModel,2)/1000:mode==='f1'?.5:2.1,cz);controls.update();
    }
    render();
  }
  function focusPorch(){
    if(!currentModel)return;
    const r=H.porchRoofGeometry(currentModel),cx=(r.x1+r.x2)/2000,cy=(r.y1+r.y2)/2000;
    const size=Math.max(r.x2-r.x1,r.y2-r.y1,r.p.roofHeight)/1000;
    controls.target.set(cx,r.p.roofHeight/2000,cy);
    camera.position.set(cx+size*.65,r.p.roofHeight/1000+size*.35,cy-size*1.8);
    controls.update();render();
  }
  const resize=()=>{const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=2*Math.atan(Math.tan(20*Math.PI/180)/Math.min(1,camera.aspect))*180/Math.PI;camera.updateProjectionMatrix();render();};
  const observer=new ResizeObserver(resize);observer.observe(host);
  let down=null;
  renderer.domElement.addEventListener('pointerdown',event=>down=[event.clientX,event.clientY]);
  renderer.domElement.addEventListener('pointerup',event=>{
    if(!down||Math.hypot(event.clientX-down[0],event.clientY-down[1])>5)return;
    const r=renderer.domElement.getBoundingClientRect(),pointer=new T.Vector2((event.clientX-r.left)/r.width*2-1,1-(event.clientY-r.top)/r.height*2);
    const ray=new T.Raycaster();ray.setFromCamera(pointer,camera);
    const visible=object=>{for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;};
    const hits=ray.intersectObject(root,true).filter(hit=>hit.object.isMesh&&visible(hit.object)&&hit.point.y<=clip.constant);
    const hit=hits[0];
    if(hit?.object.userData.entity)onSelect(hit.object.userData.entity);
  });
  resize();controls.update();
  return {update,select,setMode,render,focusPorch,
    dispose(){observer.disconnect();controls.dispose();if(root)disposeGroup(root);Object.values(mat).forEach(m=>m.dispose());edgeMat.dispose();renderer.dispose();renderer.domElement.remove();}};
};
})(window);
