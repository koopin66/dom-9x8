/* Shared geometry, in millimetres. X runs across the plan, Y from entrance to terrace. */
(function (global) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const round = value => Math.round(value * 10) / 10;
  const house = {width:9000, depth:8000, split:5075, kitchenDepth:6000,
    ceiling:2700, slab:200, atticLow:1200, atticHigh:3271, kitchenEave:2900,
    kitchenRise:1609.25, roofThickness:250, overhang:350, base:350, terraceDrop:50, facadeProjection:121};
  // Screen approximations of RAL 7024 Graphite grey and RAL 1014 Ivory.
  const defaultColors={roof:'#474a51',windowFrames:'#474a51',entranceDoor:'#474a51',
    facade:'#ddc49a',foundation:'#474a51',columns:'#474a51',casings:'#474a51',sills:'#474a51',terraceGlazing:'#474a51'};
  const colorSettings=m=>({...defaultColors,...m.colors});
  const walls = [];
  function wall(id, name, x1, y1, x2, y2, floor, roof, exterior=false) {
    walls.push({id, name, axis:x2-x1 >= y2-y1?'x':'y', x1,y1,x2,y2,floor,roof,exterior,height:0});
  }
  wall('left','Левый фасад',0,0,150,8000,0,'main',true);
  wall('front','Фасад у входа',150,0,4925,150,0,'main',true);
  wall('back','Фасад спальни',150,7850,4925,8000,0,'main',true);
  wall('ridge','Стена между объёмами',4925,0,5075,8000,0,'main',true);
  wall('kf','Кухня · входной фасад',5075,0,8850,150,1,'low',true);
  wall('kb','Кухня · выход на террасу',5075,5850,8850,6000,1,'low',true);
  wall('right','Правый фасад кухни',8850,0,9000,6000,1,'low',true);
  wall('bath','Санузел / тамбур',2050,150,2150,2425,1,'ceiling');
  wall('utility','Тамбур / техпомещение',3450,150,3550,2425,1,'ceiling');
  wall('hall','Северная стена холла',150,2425,4925,2575,1,'ceiling');
  wall('south','Южная стена холла',150,4675,4925,4825,1,'ceiling');
  wall('store','Кладовая / спальня',1950,4825,2050,7850,1,'ceiling');
  wall('upper1','Спальня 2 этажа · у входа',150,3100,4925,3250,2,'main');
  wall('upper2','Спальня 2 этажа · у террасы',150,4675,4925,4825,2,'main');
  const openings = [];
  function opening(wallId, start, width, sill, height, kind='window', floor=1, shape='rect') {
    const w=walls.find(item=>item.id===wallId);
    const base=w.axis==='x'?w.x1:w.y1;
    openings.push({id:'o'+(openings.length+1), name:(kind==='window'?'Окно':kind==='passage'?'Проём':'Дверь')+' '+(openings.length+1),
      wallId, offset:start-base, width, sill,height,kind,floor,shape,
      rakeDrop:shape==='rake'?(house.atticHigh-house.atticLow)/house.split*width/2:0,
      corner:shape==='rake'?0.5:.6875, panels:kind==='glazedDoor'?3:width>=1500?2:1, thickness:70});
  }
  [300,2300,3875].forEach(x=>opening('hall',x,900,0,2100,'door'));
  [300,3875].forEach(x=>opening('south',x,900,0,2100,'door'));
  ['upper1','upper2'].forEach(id=>opening(id,3825,900,0,2100,'door',2));
  opening('ridge',3075,1100,0,2100,'passage');
  opening('ridge',3450,800,2050,700,'window',2);
  opening('front',2300,900,0,2100,'door');
  opening('front',4275,500,1550,500);
  ['front','back'].forEach(id=>opening(id,2975,1600,800,1800,'window',2,'rake'));
  opening('back',2975,1600,300,1800);
  opening('kb',6075,2000,0,2100,'glazedDoor');
  [550,3350].forEach(y=>opening('right',y,1600,300,1800));
  opening('left',1425,500,1550,500);
  opening('left',3463,1000,300,1800);
  opening('left',6000,500,1550,500);
  const initial={schema:'dom-editor',version:1,house,walls,openings,
    stair:{x:1375,y:3860,length:3150,width:815,steps:15},
    porch:{x:2100,width:1400,depth:1200},colors:{...defaultColors}};
  Object.assign(initial.porch,porchSettings(initial));
  initial.terrace=terraceSettings(initial);
  const terraceLimits={doorWidth:[400,1800],doorHeight:[1800,2700],doorOffset:[0,20000],frameDepth:[40,120],glassOpacity:[.1,.8]};
  const porchLimits={roofWidth:[600,20000],roofDepth:[300,5000],roofAngle:[0,45],
    roofHeight:[2100,6000],roofThickness:[30,500],roofOffsetX:[-5000,5000]};
  const limits={width:[5000,20000],depth:[5000,20000],split:[2500,14000],kitchenDepth:[2500,18000],
    ceiling:[2200,4500],slab:[100,500],atticLow:[600,3000],atticHigh:[1800,6000],
    kitchenEave:[2200,5000],kitchenRise:[0,4000],roofThickness:[100,600],overhang:[0,1200],base:[150,1200],terraceDrop:[0,250],facadeProjection:[0,1200]};
  const floorZ=(m,f)=>f===2?m.house.ceiling+m.house.slab:0;
  const mainTop=(m,x)=>floorZ(m,2)+m.house.atticLow+(m.house.atticHigh-m.house.atticLow)*x/m.house.split;
  const lowTop=(m,x)=>m.house.kitchenEave+m.house.kitchenRise*(m.house.width-x)/(m.house.width-m.house.split);
  function terraceSettings(m) {
    const h=m.house,e=h.facadeProjection??121,start=h.split+e;
    const bayStart=Math.max(start,h.split+(h.width-h.split)*.49+150),bayEnd=h.width-150,bay=bayEnd-bayStart;
    const doorWidth=Math.max(400,Math.min(900,bay-120));
    const center=Math.max(bayStart+60+doorWidth/2,Math.min(h.width-1100,bayEnd-60-doorWidth/2));
    const lowest=h.kitchenEave-20-(25-h.terraceDrop),doorHeight=Math.max(1800,Math.min(2100,lowest-140));
    return {enabled:bay>=520&&h.depth-h.kitchenDepth-e>180,doorWidth,doorHeight,
      doorOffset:round(center-doorWidth/2-start),frameDepth:70,glassOpacity:.28,...m.terrace};
  }
  function terraceGeometry(m) {
    const h=m.house,p=terraceSettings(m),e=h.facadeProjection??121,w=60;
    const floor=25-h.terraceDrop,head=floor+p.doorHeight,xStart=h.split+e;
    const postX=h.split+(h.width-h.split)*.49,back=h.depth-150;
    const posts=[{x1:postX,x2:postX+150,y1:back,y2:h.depth},{x1:h.width-150,x2:h.width,y1:back,y2:h.depth}];
    const bay={a:Math.max(xStart,postX+150),b:h.width-150};
    const doorA=xStart+p.doorOffset,doorB=doorA+p.doorWidth;
    const surfaces=[],frames=[],glass=[];
    function surface(id,axis,a,b,normal,top,door=false){
      if(b<=a)return;
      const slope=(top(b)-top(a))/(b-a),topWidth=w*Math.sqrt(1+slope*slope);
      const s={id,axis,a,b,normal,top,door};surfaces.push(s);
      const bar=(a,b,bottom,upper,part='terrace-frame')=>{if(b>a)frames.push({surface:id,axis,a,b,normal,bottom,top:upper,part});};
      const pane=(a,b,bottom,upper)=>{if(b-a>1&&Math.min(upper(a),upper(b))-bottom>1)glass.push({surface:id,axis,a,b,normal,bottom,top:upper,part:'terrace-glass'});};
      bar(a,b,u=>top(u)-topWidth,top);
      bar(a,b,()=>head,()=>head+w);
      if(door){bar(a,doorA,()=>floor,()=>floor+w);bar(doorB,b,()=>floor,()=>floor+w);}
      else bar(a,b,()=>floor,()=>floor+w);
      function fixed(a,b){
        if(b-a<1)return;
        const count=Math.ceil((b-a)/1000),cuts=Array.from({length:count+1},(_,i)=>a+(b-a)*i/count);
        for(let i=0;i<cuts.length;i++){
          const lo=i===0?a:i===count?b-w:cuts[i]-w/2,hi=i===count?b:i===0?a+w:cuts[i]+w/2;
          bar(lo,hi,()=>floor,top);
        }
        for(let i=0;i<count;i++){
          const lo=cuts[i]+(i===0?w:w/2),hi=cuts[i+1]-(i===count-1?w:w/2);
          pane(lo,hi,floor+w,()=>head);pane(lo,hi,head+w,u=>top(u)-topWidth);
        }
      }
      if(door){fixed(a,doorA);fixed(doorB,b);pane(doorA,doorB,head+w,u=>top(u)-topWidth);}
      else fixed(a,b);
    }
    if(p.enabled){
      const frontY=h.depth-p.frameDepth/2;
      surface('terrace-front-left','x',xStart,postX,frontY,u=>lowTop(m,u)-20);
      surface('terrace-front-door','x',bay.a,bay.b,frontY,u=>lowTop(m,u)-20,true);
      surface('terrace-side','y',h.kitchenDepth+e,back,h.width-p.frameDepth/2,()=>lowTop(m,h.width)-20);
    }
    const door={a:doorA,b:doorB,bottom:floor,top:head,normal:h.depth-p.frameDepth/2};
    const la=doorA+4,lb=doorB-4,lz=floor+24,lt=head-4;
    door.frames=[[la,la+45,lz,lt],[lb-45,lb,lz,lt],[la+45,lb-45,lz,lz+45],[la+45,lb-45,lt-45,lt]].map(([a,b,z,Z])=>
      ({axis:'x',a,b,normal:door.normal,bottom:()=>z,top:()=>Z,part:'terrace-door-frame'}));
    door.glass={axis:'x',a:la+45,b:lb-45,normal:door.normal,bottom:lz+45,top:()=>lt-45,part:'terrace-door-glass'};
    const inner={x1:xStart,y1:h.kitchenDepth+e,x2:h.width-p.frameDepth,y2:h.depth-p.frameDepth};
    let area=Math.max(0,inner.x2-inner.x1)*Math.max(0,inner.y2-inner.y1);
    for(const post of posts)area-=Math.max(0,Math.min(inner.x2,post.x2)-Math.max(inner.x1,post.x1))*Math.max(0,Math.min(inner.y2,post.y2)-Math.max(inner.y1,post.y1));
    return {p,floor,head,xStart,bay,posts,surfaces,frames,glass,door,inner,area:Math.max(0,area)/1e6};
  }
  function porchSettings(m) {
    const p=m.porch,depth=Math.max(300,p.depth+125-(m.house.facadeProjection??121));
    return {roofWidth:p.width+150,roofDepth:depth,
      roofAngle:15,roofHeight:Math.max(m.house.ceiling,2000+depth*Math.tan(15*Math.PI/180)),roofThickness:150,roofOffsetX:0,...p};
  }
  function porchRoofGeometry(m) {
    const p=porchSettings(m),wallY=-(m.house.facadeProjection??121),slope=Math.tan(p.roofAngle*Math.PI/180);
    const x1=p.x+p.width/2+p.roofOffsetX-p.roofWidth/2,x2=x1+p.roofWidth;
    const y1=wallY-p.roofDepth,y2=wallY,thicknessZ=p.roofThickness/Math.cos(p.roofAngle*Math.PI/180);
    const bottom=y=>p.roofHeight+(y-wallY)*slope,top=y=>bottom(y)+thicknessZ;
    const postLeft=Math.max(p.x,x1+75),postRight=Math.min(p.x+p.width-100,x2-175);
    const postY=Math.min(y2-100,Math.max(-p.depth,y1+125));
    return {p,x1,x2,y1,y2,bottom,top,thicknessZ,postLeft,postRight,postY,
      overhangLeft:p.x-x1,overhangRight:x2-p.x-p.width,overhangFront:-p.depth-y1};
  }
  function wallAxis(w) {
    return w.axis==='x'?{start:w.x1,end:w.x2,lo:w.y1,hi:w.y2}:{start:w.y1,end:w.y2,lo:w.x1,hi:w.x2};
  }
  function wallTop(m,w,u) {
    const x=w.axis==='x'?u:(w.x1+w.x2)/2;
    if(w.height>0)return floorZ(m,w.floor)+w.height;
    return w.roof==='main'?mainTop(m,x):w.roof==='low'?lowTop(m,x):m.house.ceiling;
  }
  // Outer facade layer follows the L-shaped enclosed footprint, not internal joins.
  function facadeWalls(m) {
    const h=m.house,e=h.facadeProjection??121;
    if(!e)return [];
    const part=(id,x1,y1,x2,y2,baseHeight=0)=>({...m.walls.find(w=>w.id===id),x1,y1,x2,y2,baseHeight,facade:true});
    return [part('left',-e,-e,0,h.depth+e),part('front',0,-e,h.split,0),
      part('back',0,h.depth,h.split+e,h.depth+e),part('kf',h.split,-e,h.width+e,0),
      part('right',h.width,0,h.width+e,h.kitchenDepth+e),
      part('kb',h.split+e,h.kitchenDepth,h.width,h.kitchenDepth+e),
      part('ridge',h.split,h.kitchenDepth,h.split+e,h.depth),
      part('ridge',h.split,-e,h.split+e,h.kitchenDepth,lowTop(m,h.split)+h.roofThickness)];
  }
  function openingFace(m,w) {
    const ax=wallAxis(w),sign=['left','front','kf'].includes(w.id)?-1:1;
    return (sign<0?ax.lo:ax.hi)+(w.exterior?sign*(m.house.facadeProjection??121):0);
  }
  function openingGeometry(m,o) {
    const w=m.walls.find(item=>item.id===o.wallId), ax=wallAxis(w);
    const a=ax.start+o.offset,b=a+o.width,sill=floorZ(m,o.floor)+o.sill;
    const corner=a+o.width*o.corner;
    const head=u=>sill+o.height-(o.shape==='rake'?o.rakeDrop*Math.max(0,(corner-u)/(corner-a)):0);
    return {w,ax,a,b,sill,head,corner,corners:o.shape==='rake'?[corner]:[]};
  }
  function openingPlacement(m,o) {
    const g=openingGeometry(m,o),u=(g.a+g.b)/2,z=(g.sill+g.head(u))/2;
    const layer=facadeWalls(m).find(w=>{
      const ax=wallAxis(w);
      return w.id===o.wallId&&u>=ax.start&&u<=ax.end&&z>=w.baseHeight;
    });
    const ax=layer?wallAxis(layer):g.ax,thickness=o.thickness??70;
    const sign=['left','front','kf'].includes(g.w.id)?-1:1;
    const center=(ax.lo+ax.hi)/2;
    return {center,thickness,sign,face:center+sign*thickness/2,
      lo:center-thickness/2,hi:center+thickness/2,
      cutLo:Math.min(g.ax.lo,ax.lo),cutHi:Math.max(g.ax.hi,ax.hi)};
  }
  function openingFinishGeometry(m,o) {
    const g=openingGeometry(m,o);
    if(!g.w.exterior||!['window','door','glazedDoor'].includes(o.kind))return null;
    if(g.w.id==='ridge'&&g.b<=m.house.kitchenDepth&&Math.max(g.head(g.a),g.head(g.b))<=lowTop(m,m.house.split)+m.house.roofThickness)return null;
    const sign=['left','front','kf'].includes(g.w.id)?-1:1,face=openingFace(m,g.w),door=o.kind!=='window';
    const width=door?100:80;
    const top=[g.a,...g.corners.filter(u=>u>g.a&&u<g.b&&o.rakeDrop>0),g.b].map(u=>[u,g.head(u)]);
    const inner=[[g.a,g.sill],[g.b,g.sill],...top.slice().reverse()];
    // Intersect adjacent offset edges so raked heads keep a constant trim width.
    const outer=inner.map((p,i)=>{
      const prev=inner[(i+inner.length-1)%inner.length],next=inner[(i+1)%inner.length];
      const a=[p[0]-prev[0],p[1]-prev[1]],b=[next[0]-p[0],next[1]-p[1]];
      const la=Math.hypot(...a),lb=Math.hypot(...b);
      const na=[a[1]/la,-a[0]/la],nb=[b[1]/lb,-b[0]/lb];
      const aa=[p[0]+width*na[0],p[1]+width*na[1]],bb=[p[0]+width*nb[0],p[1]+width*nb[1]];
      const det=a[0]*b[1]-a[1]*b[0];
      if(Math.abs(det)<1e-8)return bb;
      const t=((bb[0]-aa[0])*b[1]-(bb[1]-aa[1])*b[0])/det;
      return [aa[0]+t*a[0],aa[1]+t*a[1]];
    });
    const casing={width,depth:21,center:face+sign*9.5,outer,inner,
      polygon:door?[[outer[0][0],g.sill],[g.a,g.sill],...top,[g.b,g.sill],[outer[1][0],g.sill],...outer.slice(2)]:null};
    let sill=null;
    if(!door){
      const placement=openingPlacement(m,o),rear=sign*(placement.face-face)-5,front=Math.max(70,rear+50),thickness=2;
      const slope=Math.tan(5*Math.PI/180),rearTop=g.sill+5,frontTop=rearTop-(front-rear)*slope;
      sill={a:g.a-30,b:g.b+30,angle:5,rear,front,rearTop,frontTop,
        profile:[[rear,rearTop+15],[rear+thickness,rearTop+15],[rear+thickness,rearTop-thickness*slope],
          [front,frontTop],[front,frontTop-15],[front-thickness,frontTop-15],[front-thickness,frontTop+thickness*slope-thickness],[rear,rearTop-thickness]]};
    }
    return {g,sign,face,casing,sill};
  }
  function alignUpperWindows(model) {
    const m=clone(model),slope=(m.house.atticHigh-m.house.atticLow)/m.house.split;
    for(const id of ['o12','o13']){
      const o=m.openings.find(o=>o.id===id),w=o&&m.walls.find(w=>w.id===o.wallId);
      if(!o||o.floor!==2||o.kind!=='window'||w?.axis!=='x'||w.roof!=='main')throw new Error('Окна 12 и 13 должны находиться на втором этаже под основным скатом.');
      Object.assign(o,{shape:'rake',corner:.5,rakeDrop:slope*o.width/2});
    }
    return canonical(m);
  }
  function roomGeometry(m,floor) {
    const h=m.house,st=m.stair,byId=id=>m.walls.find(w=>w.id===id);
    const walls=m.walls.filter(w=>(w.floor===0||w.floor===floor)&&(floor===1||w.roof!=='low'));
    const maxX=floor===1?h.width:h.split;
    const xs=[...new Set([0,maxX,h.split,st.x,st.x+st.length,...walls.flatMap(w=>[w.x1,w.x2])].filter(x=>x>=0&&x<=maxX))].sort((a,b)=>a-b);
    const ys=[...new Set([0,h.depth,h.kitchenDepth,st.y,st.y+st.width,...walls.flatMap(w=>[w.y1,w.y2])].filter(y=>y>=0&&y<=h.depth))].sort((a,b)=>a-b);
    const nx=xs.length-1,ny=ys.length-1,cells=new Uint8Array(nx*ny);
    const inStair=(x,y)=>x>st.x&&x<st.x+st.length&&y>st.y&&y<st.y+st.width;
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){
      const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;
      const inside=x<h.split||(floor===1&&y<h.kitchenDepth);
      if(inside&&!walls.some(w=>x>w.x1&&x<w.x2&&y>w.y1&&y<w.y2)&&!(floor===2&&inStair(x,y)))cells[j*nx+i]=1;
    }
    const left=byId('left').x2,right=byId('ridge').x1,front=byId('front').y2,back=byId('back').y1;
    const hints=[];
    const hint=(name,x1,y1,x2,y2)=>{if(x2>x1&&y2>y1)hints.push({name,x1,y1,x2,y2});};
    if(floor===1){
      const b=byId('bath'),u=byId('utility'),ha=byId('hall'),so=byId('south'),cl=byId('store');
      if(b?.axis==='y'&&u?.axis==='y'&&ha?.axis==='x'){
        hint('С/у',left,front,b.x1,ha.y1);hint('Тамбур',b.x2,front,u.x1,ha.y1);hint('Техпомещение',u.x2,front,right,ha.y1);
      }
      if(ha?.axis==='x'&&so?.axis==='x')hint('Холл и лестница',left,ha.y2,right,so.y1);
      if(so?.axis==='x'&&cl?.axis==='y'){
        hint('Кладовая',left,so.y2,cl.x1,back);hint('Спальня',cl.x2,so.y2,right,back);
      }
      hint('Кухня-гостиная',h.split,byId('kf').y2,byId('right').x1,byId('kb').y1);
    }else{
      const first=byId('upper1'),second=byId('upper2');
      if(first?.axis==='x')hint('Спальня 1',left,front,right,first.y1);
      if(first?.axis==='x'&&second?.axis==='x')hint('Холл',left,first.y2,right,second.y1);
      if(second?.axis==='x')hint('Спальня 2',left,second.y2,right,back);
    }
    const rooms=[];
    for(let start=0;start<cells.length;start++){
      if(cells[start]!==1)continue;
      const queue=[start],members=new Set();cells[start]=2;
      const bounds={x1:Infinity,y1:Infinity,x2:-Infinity,y2:-Infinity},scores=hints.map(()=>0);let area=0;
      for(let q=0;q<queue.length;q++){
        const key=queue[q],i=key%nx,j=Math.floor(key/nx),a=(xs[i+1]-xs[i])*(ys[j+1]-ys[j]);members.add(key);area+=a;
        bounds.x1=Math.min(bounds.x1,xs[i]);bounds.x2=Math.max(bounds.x2,xs[i+1]);bounds.y1=Math.min(bounds.y1,ys[j]);bounds.y2=Math.max(bounds.y2,ys[j+1]);
        const x=(xs[i]+xs[i+1])/2,y=(ys[j]+ys[j+1])/2;
        hints.forEach((r,k)=>{if(x>r.x1&&x<r.x2&&y>r.y1&&y<r.y2)scores[k]+=a;});
        for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
          const ii=i+di,jj=j+dj,k=jj*nx+ii;
          if(ii>=0&&ii<nx&&jj>=0&&jj<ny&&cells[k]===1){cells[k]=2;queue.push(k);}
        }
      }
      // Largest free rectangle keeps room text off walls and the stair drawing.
      let labelBox={...bounds},best=0;const heights=new Array(nx).fill(0);
      for(let j=0;j<ny;j++){
        for(let i=0;i<nx;i++)heights[i]=members.has(j*nx+i)&&!inStair((xs[i]+xs[i+1])/2,(ys[j]+ys[j+1])/2)?heights[i]+ys[j+1]-ys[j]:0;
        const stack=[];
        for(let i=0;i<=nx;i++){
          const height=i===nx?0:heights[i];let begin=i;
          while(stack.length&&stack[stack.length-1].height>height){
            const item=stack.pop(),a=(xs[i]-xs[item.begin])*item.height;begin=item.begin;
            if(a>best){best=a;labelBox={x1:xs[item.begin],x2:xs[i],y1:ys[j+1]-item.height,y2:ys[j+1]};}
          }
          if(height&&(!stack.length||stack[stack.length-1].height<height))stack.push({begin,height});
        }
      }
      const score=Math.max(0,...scores),name=score>0?hints[scores.indexOf(score)].name:'Помещение';
      rooms.push({id:'room-'+floor+'-'+rooms.length,name,area:area/1e6,width:bounds.x2-bounds.x1,depth:bounds.y2-bounds.y1,bounds,labelBox});
    }
    const counts=new Map();for(const r of rooms)counts.set(r.name,(counts.get(r.name)||0)+1);
    const indices=new Map();for(const r of rooms)if(counts.get(r.name)>1){const n=(indices.get(r.name)||0)+1;indices.set(r.name,n);r.name+=' '+n;}
    return rooms;
  }
  function mapPiece(value,oldBreak,oldEnd,newBreak,newEnd) {
    return value<=oldBreak?value*newBreak/oldBreak:newBreak+(value-oldBreak)*(newEnd-newBreak)/(oldEnd-oldBreak);
  }
  function resizeHouse(model,values) {
    const m=clone(model),old=m.house,next={...old,...values};
    const mx=v=>mapPiece(v,old.split,old.width,next.split,next.width);
    const my=v=>mapPiece(v,old.kitchenDepth,old.depth,next.kitchenDepth,next.depth);
    for(const o of m.openings){
      const w=m.walls.find(w=>w.id===o.wallId),a=wallAxis(w).start,fn=w.axis==='x'?mx:my;
      const start=fn(a+o.offset),end=fn(a+o.offset+o.width);
      o.offset=round(start-fn(a));o.width=round(end-start);
    }
    for(const w of m.walls){w.x1=round(mx(w.x1));w.x2=round(mx(w.x2));w.y1=round(my(w.y1));w.y2=round(my(w.y2));}
    const st=m.stair;
    st.length=round(mx(st.x+st.length)-mx(st.x));st.width=round(my(st.y+st.width)-my(st.y));
    st.x=round(mx(st.x));st.y=round(my(st.y));
    const porch=porchSettings(m),porchWidth=round(mx(m.porch.x+m.porch.width)-mx(m.porch.x)),factor=porchWidth/m.porch.width;
    m.porch={...porch,width:porchWidth,x:round(mx(m.porch.x)),roofWidth:round(porch.roofWidth*factor),roofOffsetX:round(porch.roofOffsetX*factor)};
    const terrace=terraceSettings(model),oldDoor=old.split+(old.facadeProjection??121)+terrace.doorOffset;
    m.house=next;
    m.terrace={...terrace,doorWidth:round(Math.max(400,Math.min(1800,terrace.doorWidth*(next.width-next.split)/(old.width-old.split)))),
      doorOffset:round(mx(oldDoor)-next.split-(next.facadeProjection??121))};
    const glazing=terraceGeometry(m),maxWidth=glazing.bay.b-glazing.bay.a-120;
    if(m.terrace.enabled&&maxWidth>=400){
      m.terrace.doorWidth=round(Math.min(m.terrace.doorWidth,maxWidth));
      const door=Math.max(glazing.bay.a+60,Math.min(mx(oldDoor),glazing.bay.b-60-m.terrace.doorWidth));
      m.terrace.doorOffset=round(door-glazing.xStart);
    }
    return m;
  }
  function validate(m) {
    const errors=[];
    const validNumber=v=>typeof v==='number'&&Number.isFinite(v);
    if(!m||m.schema!=='dom-editor'||m.version!==1||!m.house||!Array.isArray(m.walls)||!Array.isArray(m.openings))return ['Неизвестный формат проекта. Нужен JSON из этого редактора.'];
    if(m.colors!==undefined&&(!m.colors||typeof m.colors!=='object'||Array.isArray(m.colors)))return ['Неверный формат цветов дома.'];
    const colors=colorSettings(m);
    if(Object.keys(defaultColors).some(key=>typeof colors[key]!=='string'||!/^#[a-f\d]{6}$/i.test(colors[key])))errors.push('Цвета задаются в формате HEX #RRGGBB, например #474A51.');
    const h={facadeProjection:121,...m.house};
    for(const [key,[min,max]] of Object.entries(limits))if(!validNumber(h[key])||h[key]<min||h[key]>max)errors.push('Недопустимый параметр дома «'+key+'» ('+min+'…'+max+' мм).');
    if(h.width-h.split<1800||h.depth-h.kitchenDepth<500)errors.push('Крыло кухни должно быть шире 1800 мм, терраса глубже 500 мм.');
    if(h.atticHigh<h.atticLow||h.terraceDrop>=h.base)errors.push('Проверьте высоты ската и основания террасы.');
    if(lowTop(m,h.split)+h.roofThickness>mainTop(m,h.split)-100)errors.push('Кровля кухни должна оставаться ниже верха двухэтажной части.');
    if(m.walls.length>100||m.openings.length>200)return ['Слишком много элементов. Максимум 100 стен и 200 проёмов.'];
    if(['left','front','back','ridge','kf','kb','right'].some(id=>!m.walls.some(w=>w&&w.id===id&&w.exterior)))return ['В файле отсутствуют обязательные стены наружного контура.'];
    const ids=new Set();
    for(const w of m.walls){
      if(typeof w.id!=='string'||ids.has(w.id)||typeof w.name!=='string'||w.name.length>100)errors.push('Некорректные имена или повторяющиеся номера стен.');
      ids.add(w.id);
      if(!['x','y'].includes(w.axis)||![0,1,2].includes(w.floor)||!['main','low','ceiling'].includes(w.roof)||typeof w.exterior!=='boolean')errors.push('Некорректные свойства стены.');
      if(!['x1','x2','y1','y2','height'].every(k=>validNumber(w[k])))return ['Координаты стен должны быть числами.'];
      const ax=wallAxis(w),t=ax.hi-ax.lo;
      if(w.x1<0||w.y1<0||w.x2>h.width+.1||w.y2>h.depth+.1||ax.end-ax.start<200||t<50||t>1000||w.height<0||w.height>10000)errors.push(w.name+' — проверьте границы, длину и толщину (50…1000 мм).');
      if(wallTop(m,w,ax.start)<floorZ(m,w.floor)+100||wallTop(m,w,ax.end)<floorZ(m,w.floor)+100)errors.push(w.name+' — верх стены ниже её основания.');
    }
    ids.clear();
    for(const o of m.openings){
      if(typeof o.id!=='string'||ids.has(o.id)||typeof o.name!=='string'||o.name.length>100)errors.push('Некорректные имена или повторяющиеся номера проёмов.');
      ids.add(o.id);
      const w=m.walls.find(w=>w.id===o.wallId);
      if(!w)return ['Проём ссылается на отсутствующую стену.'];
      if(!['offset','width','sill','height','rakeDrop','corner','panels'].every(k=>validNumber(o[k])))return ['Размеры проёмов должны быть числами.'];
      if(o.thickness!==undefined&&(!validNumber(o.thickness)||o.thickness<20||o.thickness>300))errors.push(o.name+' — толщина окна должна быть от 20 до 300 мм.');
      if(![1,2].includes(o.floor)||!['window','door','glazedDoor','passage'].includes(o.kind)||!['rect','rake'].includes(o.shape)||!Number.isInteger(o.panels)||o.panels<1||o.panels>4||o.corner<.1||o.corner>1)return ['Некорректные свойства проёма.'];
      const g=openingGeometry(m,o);
      if(w.floor!==0&&w.floor!==o.floor)errors.push(o.name+' — этаж должен совпадать с этажом стены.');
      if(o.offset<0||o.width<250||o.height<250||o.sill<0||o.rakeDrop<0||(o.shape==='rake'&&o.height-o.rakeDrop<200)||g.b>g.ax.end+.1)errors.push(o.name+' — проём выходит за длину стены или слишком мал.');
      if([g.a,g.b,...g.corners].some(u=>g.head(u)>wallTop(m,w,u)-30))errors.push(o.name+' — верх проёма должен быть минимум на 30 мм ниже верха стены.');
    }
    if(errors.length)return [...new Set(errors)];
    for(let i=0;i<m.openings.length;i++)for(let j=i+1;j<m.openings.length;j++){
      const a=m.openings[i],b=m.openings[j];if(a.wallId!==b.wallId)continue;
      const ga=openingGeometry(m,a),gb=openingGeometry(m,b),lo=Math.max(ga.a,gb.a),hi=Math.min(ga.b,gb.b);
      if(hi>lo&&[lo,hi,ga.corner,gb.corner].filter(u=>u>=lo&&u<=hi).some(u=>Math.min(ga.head(u),gb.head(u))>Math.max(ga.sill,gb.sill)))errors.push(a.name+' пересекается с '+b.name+'.');
    }
    const st=m.stair,p=m.porch;
    if(!st||!['x','y','length','width','steps'].every(k=>validNumber(st[k]))||st.x<0||st.y<0||st.length<1000||st.width<500||st.x+st.length>h.split||st.y+st.width>h.depth||!Number.isInteger(st.steps)||st.steps<8||st.steps>30)errors.push('Лестница должна помещаться в двухэтажной части. Ширина от 500 мм, от 8 до 30 подъёмов.');
    if(!p||!['x','width','depth'].every(k=>validNumber(p[k]))||p.x<0||p.width<600||p.depth<300||p.depth>3000||p.x+p.width>h.split)errors.push('Проверьте размеры и положение крыльца.');
    else{
      const settings=porchSettings(m);
      const invalid=Object.entries(porchLimits).some(([key,[min,max]])=>!validNumber(settings[key])||settings[key]<min||settings[key]>max);
      if(invalid)errors.push('Проверьте размеры крыши входа: угол 0…45°, ширина 600…20000 мм, вылет 300…5000 мм, высота 2100…6000 мм, толщина 30…500 мм, смещение ±5000 мм.');
      else{
        const roof=porchRoofGeometry(m);
        if(roof.bottom(roof.y1)<1800)errors.push('Передний край крыши входа ниже 1800 мм. Поднимите крышу либо уменьшите угол или вылет.');
        if(roof.postRight-roof.postLeft<200||roof.postY+100>roof.y2)errors.push('Крыша входа должна перекрывать крыльцо в местах двух опор. Измените ширину, вылет или смещение крыши.');
      }
    }
    if(m.terrace!==undefined&&(!m.terrace||typeof m.terrace!=='object'||Array.isArray(m.terrace)))errors.push('Неверный формат параметров террасы.');
    else{
      const t=terraceSettings(m);
      if(typeof t.enabled!=='boolean'||Object.entries(terraceLimits).some(([key,[min,max]])=>!validNumber(t[key])||t[key]<min||t[key]>max))errors.push('Проверьте параметры остекления террасы и двери.');
      else if(t.enabled){
        const g=terraceGeometry(m);
        if(g.door.a<g.bay.a+60-.1||g.door.b>g.bay.b-60+.1)errors.push('Дверь террасы должна помещаться между двумя столбами со стороны ступеней. Измените ширину или отступ двери.');
        if(g.door.top+120>Math.min(lowTop(m,g.door.a),lowTop(m,g.door.b),lowTop(m,h.width))-20)errors.push('Дверь и остекление должны помещаться под крышей террасы. Уменьшите высоту двери.');
        if(h.depth-h.kitchenDepth-(h.facadeProjection??121)<=180)errors.push('Недостаточно глубины террасы для остекления.');
      }
    }
    return [...new Set(errors)];
  }
  function canonical(value) {
    const errors=validate(value);if(errors.length)throw new Error(errors.slice(0,4).join('\n'));
    // Whitelist imported fields; no embedded markup, callbacks, or unknown state is retained.
    const pick=(obj,keys)=>Object.fromEntries(keys.map(k=>[k,obj[k]]));
    return {schema:'dom-editor',version:1,house:pick({facadeProjection:121,...value.house},Object.keys(house)),
      walls:value.walls.map(w=>pick(w,Object.keys(walls[0]))),
      openings:value.openings.map(o=>pick({thickness:70,...o},Object.keys(openings[0]))),
      stair:pick(value.stair,Object.keys(initial.stair)),porch:pick(porchSettings(value),Object.keys(initial.porch)),
      colors:pick(colorSettings(value),Object.keys(defaultColors)),terrace:pick(terraceSettings(value),Object.keys(initial.terrace))};
  }
  const api={initial,clone,round,limits,defaultColors,colorSettings,terraceLimits,terraceSettings,terraceGeometry,porchLimits,porchSettings,porchRoofGeometry,floorZ,mainTop,lowTop,wallAxis,wallTop,facadeWalls,openingFace,openingGeometry,openingPlacement,openingFinishGeometry,alignUpperWindows,roomGeometry,resizeHouse,validate,canonical};
  global.HouseModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
