/* editor-model.js */
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
    facade:'#ddc49a',foundation:'#474a51',columns:'#474a51'};
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
  const porchLimits={roofWidth:[600,20000],roofDepth:[300,5000],roofAngle:[0,45],
    roofHeight:[2100,6000],roofThickness:[30,500],roofOffsetX:[-5000,5000]};
  const limits={width:[5000,20000],depth:[5000,20000],split:[2500,14000],kitchenDepth:[2500,18000],
    ceiling:[2200,4500],slab:[100,500],atticLow:[600,3000],atticHigh:[1800,6000],
    kitchenEave:[2200,5000],kitchenRise:[0,4000],roofThickness:[100,600],overhang:[0,1200],base:[150,1200],terraceDrop:[0,250],facadeProjection:[0,1200]};
  const floorZ=(m,f)=>f===2?m.house.ceiling+m.house.slab:0;
  const mainTop=(m,x)=>floorZ(m,2)+m.house.atticLow+(m.house.atticHigh-m.house.atticLow)*x/m.house.split;
  const lowTop=(m,x)=>m.house.kitchenEave+m.house.kitchenRise*(m.house.width-x)/(m.house.width-m.house.split);
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
    m.house=next;return m;
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
      colors:pick(colorSettings(value),Object.keys(defaultColors))};
  }
  const api={initial,clone,round,limits,defaultColors,colorSettings,porchLimits,porchSettings,porchRoofGeometry,floorZ,mainTop,lowTop,wallAxis,wallTop,facadeWalls,openingFace,openingGeometry,openingPlacement,alignUpperWindows,roomGeometry,resizeHouse,validate,canonical};
  global.HouseModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);

;
/* editor-drawings.js */
(function(global){
  'use strict';
  const H=global.HouseModel;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Math.round(n).toLocaleString('ru-RU');
  const css=`.wall{fill:#d9dfdc;stroke:#354640;stroke-width:1.2}.selected{fill:#b5e2d7;stroke:#147d69;stroke-width:2}.opening{fill:#e6f1f5;stroke:#48798a;stroke-width:1.4}.door{fill:#fff;stroke:#9a754c;stroke-width:1.4}.fine{fill:none;stroke:#889790;stroke-width:.7}.canopy{fill:none;stroke:#53615d;stroke-width:1;stroke-dasharray:6 4}.canopy.selected{stroke:#147d69;stroke-width:2}.porch-post{fill:#f3f1e9;stroke:#8b9992;stroke-width:.7}.roof{fill:#d7dddd;stroke:#53615d;stroke-width:1}.plinth{fill:#8f9395;stroke:#53615d;stroke-width:1}.floor{fill:#f0eee8;stroke:#a8afa9;stroke-width:1}.dim{fill:none;stroke:#647970;stroke-width:.7}.accent{fill:none;stroke:#147d69;stroke-width:1.5}text{font-family:system-ui,sans-serif;fill:#354640;font-size:180px} .dimension{font-size:185px;paint-order:stroke;stroke:#fff;stroke-width:65px;stroke-linejoin:round}.label{font-size:150px}.room-name{paint-order:stroke;stroke:#f0eee8;stroke-width:45px;stroke-linejoin:round}.room-area{font-size:175px;font-weight:600;fill:#147d69;paint-order:stroke;stroke:#f0eee8;stroke-width:40px}.room-size{font-size:145px;paint-order:stroke;stroke:#fff;stroke-width:45px;stroke-linejoin:round}.room-dim{fill:none;stroke:#75877f;stroke-width:.6}.hit{cursor:pointer}path,line,rect,polygon{vector-effect:non-scaling-stroke}.hit:focus{outline:none;stroke:#147d69;stroke-width:3}`;
  const line=(x1,y1,x2,y2,cls='fine')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  const rect=(x,y,w,h,cls,extra='')=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" class="${cls}" ${extra}/>`;
  const text=(x,y,value,cls='label',extra='')=>`<text x="${x}" y="${y}" text-anchor="middle" class="${cls}" ${extra}>${esc(value)}</text>`;
  const poly=(points,cls,extra='')=>`<polygon points="${points.map(p=>p.join(',')).join(' ')}" class="${cls}" ${extra}/>`;
  const attr=(type,obj)=>`data-type="${type}" data-id="${esc(obj.id)}" tabindex="0" role="button" aria-label="${esc(obj.name||'Лестница')}"`;
  const chosen=(selection,type,id)=>selection&&selection.type===type&&selection.id===id;
  function dimX(a,b,y,from,label){
    return line(a,from,a,y-80,'dim')+line(b,from,b,y-80,'dim')+line(a,y,b,y,'dim')+line(a-55,y+70,a+55,y-70,'dim')+line(b-55,y+70,b+55,y-70,'dim')+text((a+b)/2,y-100,label||fmt(b-a),'dimension');
  }
  function dimY(a,b,x,from,label){
    return line(from,a,x+80,a,'dim')+line(from,b,x+80,b,'dim')+line(x,a,x,b,'dim')+line(x-55,a+70,x+55,a-70,'dim')+line(x-55,b+70,x+55,b-70,'dim')+text(x-120,(a+b)/2,label||fmt(b-a),'dimension',`transform="rotate(-90 ${x-120} ${(a+b)/2})"`);
  }
  function roomAnnotations(room){
    const b=room.bounds,r=room.labelBox,cx=(r.x1+r.x2)/2,cy=(r.y1+r.y2)/2;
    const area=room.area.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})+' м²';
    const nameSize=Math.max(85,Math.min(150,(r.x2-r.x1-160)/(room.name.length*.58)));
    let out=`<g data-room-id="${room.id}" data-room-area="${room.area}">`;
    out+=text(cx,cy-(r.x2-r.x1<1800?240:90),room.name,'label room-name',`style="font-size:${nameSize}px"`);
    out+=text(cx,cy+135,area,'room-area');
    const y=b.y1+Math.min(190,room.depth*.2),x=b.x1+Math.min(190,room.width*.2),tick=45;
    if(room.width>=400){
      out+=line(b.x1,b.y1,b.x1,y+60,'room-dim')+line(b.x2,b.y1,b.x2,y+60,'room-dim')+line(b.x1,y,b.x2,y,'room-dim');
      out+=line(b.x1-tick,y+tick,b.x1+tick,y-tick,'room-dim')+line(b.x2-tick,y+tick,b.x2+tick,y-tick,'room-dim');
      out+=text((b.x1+b.x2)/2,y-70,fmt(room.width),'room-size',`data-room-width="${room.width}"`);
    }
    if(room.depth>=400){
      out+=line(b.x1,b.y1,x+60,b.y1,'room-dim')+line(b.x1,b.y2,x+60,b.y2,'room-dim')+line(x,b.y1,x,b.y2,'room-dim');
      out+=line(x-tick,b.y1+tick,x+tick,b.y1-tick,'room-dim')+line(x-tick,b.y2+tick,x+tick,b.y2-tick,'room-dim');
      out+=text(x-70,(b.y1+b.y2)/2,fmt(room.depth),'room-size',`data-room-depth="${room.depth}" transform="rotate(-90 ${x-70} ${(b.y1+b.y2)/2})"`);
    }
    return out+'</g>';
  }
  function plan(m,floor,selection){
    const h=m.house,z=H.floorZ(m,floor),st=m.stair,canopy=H.porchRoofGeometry(m);
    let out='';
    out+=rect(0,0,h.split,h.depth,'floor');
    out+=rect(h.split,0,h.width-h.split,h.kitchenDepth,floor===1?'floor':'roof');
    out+=rect(h.split,h.kitchenDepth,h.width-h.split,h.depth-h.kitchenDepth,'floor');
    out+=text((h.split+h.width)/2,(h.depth+h.kitchenDepth)/2,`Терраса · основание −${h.terraceDrop} мм`);
    out+=rect(m.porch.x,-m.porch.depth,m.porch.width,m.porch.depth,`floor hit ${selection?.type==='porch'?'selected':''}`,attr('porch',{id:'porch',name:'Крыльцо'}));
    out+=text(m.porch.x+m.porch.width/2,-m.porch.depth/2,'Крыльцо');
    out+=`<g class="hit" ${attr('porch',{id:'porch',name:'Крыша главного входа'})}>`;
    out+=rect(canopy.x1,canopy.y1,canopy.x2-canopy.x1,canopy.y2-canopy.y1,`canopy ${selection?.type==='porch'?'selected':''}`,`data-porch-roof-angle="${canopy.p.roofAngle}"`);
    out+=text((canopy.x1+canopy.x2)/2,canopy.y1-140,`Козырёк · ${canopy.p.roofAngle}°`);
    const arrowX=canopy.x2-190,arrowY=canopy.y1+250;
    out+=line(arrowX,canopy.y2-100,arrowX,arrowY,'accent');
    out+=poly([[arrowX,arrowY],[arrowX-55,arrowY+100],[arrowX+55,arrowY+100]],'opening');
    out+='</g>';
    if(selection?.type==='porch')out+=dimX(canopy.x1,canopy.x2,canopy.y1+210,canopy.y1)+dimY(canopy.y1,canopy.y2,canopy.x2+300,canopy.x2);
    for(const w of H.facadeWalls(m).filter(w=>w.baseHeight<=z+1200&&(floor===1||w.roof!=='low')))
      out+=rect(w.x1,w.y1,w.x2-w.x1,w.y2-w.y1,'wall');
    const active=m.walls.filter(w=>(w.floor===0||w.floor===floor)&&(floor===1||w.roof!=='low'));
    for(const w of active)out+=rect(w.x1,w.y1,w.x2-w.x1,w.y2-w.y1,`wall hit ${chosen(selection,'wall',w.id)?'selected':''}`,attr('wall',w));
    for(const o of m.openings.filter(o=>o.floor===floor)){
      const {w,ax,a,b}=H.openingGeometry(m,o),horizontal=w.axis==='x',placement=H.openingPlacement(m,o);
      const thick=placement.cutHi-placement.cutLo;
      const x=horizontal?a:placement.cutLo,y=horizontal?placement.cutLo:a,ww=horizontal?b-a:thick,hh=horizontal?thick:b-a;
      const cls=o.kind==='door'||o.kind==='passage'?'door':'opening';
      const selected=chosen(selection,'opening',o.id)?'selected':'';
      out+=`<g class="hit" ${attr('opening',o)}>`;
      out+=rect(x,y,ww,hh,`door ${cls==='door'?selected:''}`);
      if(o.kind==='window'||o.kind==='glazedDoor'){
        out+=rect(horizontal?a:placement.lo,horizontal?placement.lo:a,
          horizontal?b-a:placement.thickness,horizontal?placement.thickness:b-a,
          `opening ${selected}`,`data-window-frame="${esc(o.id)}"`);
        if(horizontal)out+=line(a,placement.center,b,placement.center);
        else out+=line(placement.center,a,placement.center,b);
      }
      if(o.kind==='door'){
        const depth=Math.min(o.width,900);
        out+=horizontal?line(a,ax.hi,a,ax.hi+depth):line(ax.hi,a,ax.hi+depth,a);
      }
      out+='</g>';
    }
    const rooms=H.roomGeometry(m,floor);
    const step=st.length/(st.steps-1);
    out+=rect(st.x,st.y,st.length,st.width,`floor hit ${chosen(selection,'stair','stair')?'selected':''}`,attr('stair',{id:'stair'}));
    for(let i=1;i<st.steps-1;i++)out+=line(st.x+step*i,st.y,st.x+step*i,st.y+st.width);
    out+=line(st.x+100,st.y+st.width/2,st.x+st.length-100,st.y+st.width/2,'accent');
    out+=poly([[st.x+st.length-100,st.y+st.width/2],[st.x+st.length-300,st.y+st.width/2-90],[st.x+st.length-300,st.y+st.width/2+90]],'opening');
    out+=rooms.map(roomAnnotations).join('');
    out+=dimX(0,h.width,Math.min(-m.porch.depth,canopy.y1)-400,0)+dimX(0,h.split,h.depth+400,h.depth)+dimX(h.split,h.width,h.depth+400,h.depth);
    out+=dimY(0,h.depth,-450,0)+dimY(0,h.kitchenDepth,h.width+450,h.width)+dimY(h.kitchenDepth,h.depth,h.width+450,h.width);
    out+=text(h.width/2,h.depth+950,`${floor} этаж · пол ${z===0?'±0,000':'+'+(z/1000).toFixed(3)} м · расстояния между стенами, мм · площади в м²`);
    out+=text(h.width/2,h.depth+1400,floor===2?'Площади по полу; лестничный проём исключён.':'Площади по полу; лестница включена в площадь холла.');
    const e=h.facadeProjection??121;
    if(e){
      out+=dimX(-e,h.width+e,Math.min(-m.porch.depth,canopy.y1)-750,-e);
      out+=dimY(-e,h.depth+e,-850,-e);
      out+=text(h.width/2,h.depth+1200,`Выступ фасада наружу: ${fmt(e)} мм с каждой внешней стороны`);
    }
    if(selection?.type==='wall'){
      const w=active.find(w=>w.id===selection.id);
      if(w){const a=H.wallAxis(w);out+=w.axis==='x'?dimX(a.start,a.end,a.lo-350,a.lo):dimY(a.start,a.end,a.lo-350,a.lo);}
    }
    if(selection?.type==='opening'){
      const o=m.openings.find(o=>o.id===selection.id&&o.floor===floor);
      if(o){const {w,ax,a,b}=H.openingGeometry(m,o);out+=w.axis==='x'?dimX(a,b,ax.lo-300,ax.lo):dimY(a,b,ax.lo-300,ax.lo);}
    }
    return out;
  }
  const elevationPoint=(u,z)=>[u,-z];
  function porchElevation(m,view,selection){
    if(view==='back')return '';
    const r=H.porchRoofGeometry(m),p=m.porch,selected=selection?.type==='porch'?'selected':'';
    let out=`<g class="hit" ${attr('porch',{id:'porch',name:'Крыльцо и крыша входа'})}>`;
    if(view==='front'){
      out+=rect(p.x,25,p.width,m.house.base-25,'plinth')+rect(p.x,0,p.width,25,'floor');
      for(const x of [r.postLeft,r.postRight])out+=rect(x,-r.bottom(r.postY+100),100,r.bottom(r.postY+100),'porch-post');
      out+=rect(r.x1,-r.top(r.y2),r.x2-r.x1,r.top(r.y2)-r.bottom(r.y1),`roof ${selected}`);
      out+=line(r.x1,-r.top(r.y1),r.x2,-r.top(r.y1));
      out+=text((r.x1+r.x2)/2,-r.top(r.y2)-120,`Козырёк ${r.p.roofAngle}°`);
    }else{
      out+=rect(-p.depth,25,p.depth,m.house.base-25,'plinth')+rect(-p.depth,0,p.depth,25,'floor');
      const y=r.postY;
      out+=poly([[y,0],[y+100,0],[y+100,-r.bottom(y+100)],[y,-r.bottom(y)]],'porch-post');
      out+=poly([[r.y1,-r.bottom(r.y1)],[r.y2,-r.bottom(r.y2)],[r.y2,-r.top(r.y2)],[r.y1,-r.top(r.y1)]],`roof ${selected}`,`data-porch-roof-angle="${r.p.roofAngle}"`);
    }
    return out+'</g>';
  }

  function elevation(m,view,selection){
    const h=m.house,top=H.mainTop(m,h.split),st=m.stair;
    let out='';
    const walls=view==='front'?['front','kf']:view==='back'?['back','kb']:view==='left'?['left']:['ridge','right'];
    // Project the added facade envelope behind the existing elevations.
    for(const w of H.facadeWalls(m).filter(w=>walls.includes(w.id))){
      const side=view==='left'||view==='right',a=side?w.y1:w.x1===0?-(h.facadeProjection??121):w.x1,b=side?w.y2:w.x2;
      const z1=H.wallTop(m,w,w.axis==='x'?w.x1:w.y1),z2=H.wallTop(m,w,w.axis==='x'?w.x2:w.y2);
      const za=side?Math.max(z1,z2):H.wallTop(m,{...w,axis:'x'},a);
      const zb=side?Math.max(z1,z2):H.wallTop(m,{...w,axis:'x'},b);
      out+=poly([[a,w.baseHeight],[b,w.baseHeight],[b,zb],[a,za]].map(p=>elevationPoint(...p)),'wall');
    }
    const width=view==='left'||view==='right'?h.depth:h.width;
    for(const id of walls){
      const w=m.walls.find(w=>w.id===id);if(!w)continue;
      const ax=H.wallAxis(w),base=H.floorZ(m,w.floor);
      out+=poly([[ax.start,base],[ax.end,base],[ax.end,H.wallTop(m,w,ax.end)],[ax.start,H.wallTop(m,w,ax.start)]].map(p=>elevationPoint(...p)),`wall hit ${chosen(selection,'wall',id)?'selected':''}`,attr('wall',w));
      for(const o of m.openings.filter(o=>o.wallId===id)){
        const g=H.openingGeometry(m,o);
        const shape=[[g.a,g.sill],[g.b,g.sill],...[g.a,...g.corners,g.b].reverse().map(u=>[u,g.head(u)])];
        out+=poly(shape.map(p=>elevationPoint(...p)),`${o.kind==='door'?'door exterior-door':'opening exterior-window'} hit ${chosen(selection,'opening',o.id)?'selected':''}`,attr('opening',o));
        if(o.kind==='window'||o.kind==='glazedDoor')for(let i=1;i<o.panels;i++){const u=g.a+o.width*i/o.panels;out+=line(u,-g.sill,u,-g.head(u),'exterior-sash');}
        out+=text((g.a+g.b)/2,-g.sill-90,`${fmt(o.width)} × ${fmt(o.height)}`,'dimension');
      }
    }
    if(view==='front'||view==='back'){
      for(const [a,b,fn] of [[-h.overhang,h.split+h.overhang,x=>H.mainTop(m,x)],[h.split,h.width+h.overhang,x=>H.lowTop(m,x)]])
        out+=poly([[a,fn(a)],[b,fn(b)],[b,fn(b)+h.roofThickness],[a,fn(a)+h.roofThickness]].map(p=>elevationPoint(...p)),'roof');
      out+=rect(0,0,h.split,h.base,'plinth')+rect(h.split,view==='back'?h.terraceDrop:0,h.width-h.split,h.base-(view==='back'?h.terraceDrop:0),'plinth');
    }else{
      out+=rect(-h.overhang,-top-h.roofThickness,h.depth+2*h.overhang,view==='left'?top-H.mainTop(m,0)+h.roofThickness:h.roofThickness,'roof');
      if(view==='right')out+=rect(-h.overhang,-H.lowTop(m,h.split)-h.roofThickness,h.depth+2*h.overhang,H.lowTop(m,h.split)-H.lowTop(m,h.width)+h.roofThickness,'roof');
      out+=rect(0,0,view==='right'?h.kitchenDepth:width,h.base,'plinth');
      if(view==='right')out+=rect(h.kitchenDepth,h.terraceDrop,h.depth-h.kitchenDepth,h.base-h.terraceDrop,'plinth');
    }
    out+=porchElevation(m,view,selection);
    out+=dimX(0,width,h.base+450,h.base)+dimY(-top,0,-600,0,fmt(top));
    out+=text(width/2,h.base+850,'Размеры окон — ширина × максимальная высота, мм');
    return out;
  }
  function section(m){
    const h=m.house,st=m.stair,y=st.y+st.width/2,z2=H.floorZ(m,2);
    let out=rect(0,0,h.width,h.base,'floor');
    for(const w of [...m.walls,...H.facadeWalls(m)].filter(w=>w.y1<=y&&w.y2>=y)){
      const base=w.baseHeight??H.floorZ(m,w.floor);
      out+=poly([[w.x1,base],[w.x2,base],[w.x2,H.wallTop(m,w,w.axis==='x'?w.x2:y)],[w.x1,H.wallTop(m,w,w.axis==='x'?w.x1:y)]].map(p=>elevationPoint(...p)),'wall');
    }
    out+=rect(0,-z2,st.x,h.slab,'floor')+rect(st.x+st.length,-z2,h.split-st.x-st.length,h.slab,'floor');
    for(let i=0;i<st.steps-1;i++)out+=rect(st.x+i*st.length/(st.steps-1),-(i+1)*z2/st.steps,st.length/(st.steps-1),55,'floor');
    for(const [a,b,fn] of [[0,h.split,x=>H.mainTop(m,x)],[h.split,h.width,x=>H.lowTop(m,x)]])out+=poly([[a,fn(a)],[b,fn(b)],[b,fn(b)+h.roofThickness],[a,fn(a)+h.roofThickness]].map(p=>elevationPoint(...p)),'roof');
    out+=dimX(0,h.width,h.base+450,h.base)+dimY(-h.ceiling,0,-500,0)+dimY(-z2,-h.ceiling,-950,0)+dimY(-H.mainTop(m,h.split),-z2,h.width+600,h.split);
    out+=text(h.width/2,h.base+950,`Сечение по лестнице · Y = ${fmt(y)} мм · подъём ${fmt(z2/st.steps)} мм`);
    return out;
  }
  function draw(m,view,selection){
    const h=m.house,planView=view==='plan1'||view==='plan2';
    const width=view==='left'||view==='right'?h.depth:h.width;
    const r=H.porchRoofGeometry(m),side=view==='left'||view==='right';
    const roofMax=Math.max(H.mainTop(m,h.split+h.overhang),H.lowTop(m,h.split),r.top(r.y2))+h.roofThickness;
    const minX=planView?Math.min(-1300,r.x1-700):side?Math.min(-1400,r.y1-600):view==='front'?Math.min(-1400,r.x1-600):-1400;
    const maxX=planView?Math.max(h.width+1300,r.x2+700):view==='front'?Math.max(width+1400,r.x2+600):width+1400;
    const minY=planView?Math.min(-m.porch.depth,r.y1)-1050:-roofMax-600;
    const maxY=planView?h.depth+1650:h.base+1300;
    const box=[minX,minY,maxX-minX,maxY-minY];
    const colors=H.colorSettings(m);
    const finishes=planView||view==='section'?'':`.wall{fill:${colors.facade}}.roof{fill:${colors.roof}}.plinth{fill:${colors.foundation}}.porch-post{fill:${colors.columns}}.exterior-window{stroke:${colors.windowFrames};stroke-width:2}.exterior-sash{stroke:${colors.windowFrames};stroke-width:2}.exterior-door{fill:${colors.entranceDoor};stroke:${colors.entranceDoor}}.selected{fill:#b5e2d7;stroke:#147d69}`;
    const content=planView?plan(m,view==='plan1'?1:2,selection):view==='section'?section(m):elevation(m,view,selection);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img" aria-label="Редактируемый чертёж дома"><style>${css}${finishes}</style><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="white"/>${content}</svg>`;
  }
  global.HouseDrawings={draw};
})(window);

;
/* editor-3d.js */
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
  const C=H.defaultColors;
  const mat={wall:M(C.facade),wallIn:M(0xefebe3),roof:M(C.roof,{roughness:.55,metalness:.25}),seam:M(C.roof,{roughness:.5,metalness:.3}),
    plinth:M(C.foundation),deck:M(0xa47750),wood:M(0x8a603f),glass:M(0x91a4b1,{transparent:true,opacity:.83,roughness:.24,metalness:.12}),
    sash:M(C.windowFrames),frame:M(C.windowFrames,{roughness:.6}),door:M(C.entranceDoor),column:M(C.columns,{roughness:.6}),roofUnder:M(C.roof,{roughness:.6}),doorIn:M(0xe7dfd2),slab:M(0xcfc8ba),floor:M(0xcbb08a),ground:M(0xa6aa98,{roughness:1}),
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
    const colors=H.colorSettings(model);
    for(const [material,key] of Object.entries({wall:'facade',roof:'roof',roofUnder:'roof',seam:'roof',plinth:'foundation',sash:'windowFrames',frame:'windowFrames',door:'entranceDoor',column:'columns'}))
      mat[material].color.set(colors[key]).convertSRGBToLinear();
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
        add(place(prism(pts,44,w.ext?mat.door:mat.doorIn),along,tc-22,tc+22),root,false);
      }
    });
  }


    entity=null;
    function solid(x,y,z,X,Y,Z,m,parent){
      if(X>x&&Y>y&&Z>z)return add(box(x,y,z,X,Y,Z,m),parent,false);
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
      layer(0,h.roofThickness*.82,mat.roofUnder);layer(h.roofThickness*.82,h.roofThickness,mat.roof);
    }
    roof(-h.overhang,h.split+h.overhang,high);roof(h.split,h.width+h.overhang,low);
    const right=h.width-150,back=h.depth-150;
    for(const [x,y] of [[h.split+(h.width-h.split)*.49,back],[right,back]])
      solid(x,y,25-h.terraceDrop,x+150,y+150,low(x),mat.column);
    entity={type:'porch',id:'porch'};
    const porchBase=solid(p.x,-p.depth,-h.base,p.x+p.width,0,-25,mat.plinth);
    porchBase.userData.part='porch-foundation';
    solid(p.x,-p.depth,-25,p.x+p.width,0,0,mat.deck);
    const canopy=H.porchRoofGeometry(model);
    const roofPanel=prism([[canopy.y1,canopy.bottom(canopy.y1)],[canopy.y2,canopy.bottom(canopy.y2)],
      [canopy.y2,canopy.top(canopy.y2)],[canopy.y1,canopy.top(canopy.y1)]],canopy.x2-canopy.x1,mat.roof);
    roofPanel.userData.part='porch-roof';
    add(place(roofPanel,'Y',canopy.x1,canopy.x2),roofG,false);
    for(const x of [canopy.postLeft,canopy.postRight]){
      const y=canopy.postY;
      const post=prism([[y,0],[y+100,0],[y+100,canopy.bottom(y+100)],[y,canopy.bottom(y)]],100,mat.column);
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

;
/* editor.js */
(async function(){
  'use strict';
  const H=window.HouseModel,storeKey='dom-9x8-editor-v1';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const f=n=>Math.round(n).toLocaleString('ru-RU');
  let model=H.clone(H.initial),selection={type:'house',id:'house'},view='plan1',mode='all',view3d;
  let undo=[],redo=[],timer,toastTimer,zoom=1;
  function toast(message){$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,5500);}
  function save(){
    try{localStorage.setItem(storeKey,JSON.stringify(model));$('saved').textContent='Сохранено в этом браузере · '+new Date().toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});}
    catch{$('saved').textContent='Автосохранение недоступно. Скачайте JSON проекта.';}
  }
  try{const saved=localStorage.getItem(storeKey);if(saved){model=H.canonical(JSON.parse(saved));$('saved').textContent='Открыт ваш сохранённый вариант';}}
  catch{toast('Сохранённый вариант не удалось прочитать. Открыт исходный проект.');}
  function fail(message){$('error').textContent=message;$('error').hidden=false;}
  function updateButtons(){$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;}
  function commit(next,refreshInspector=false){
    let clean;try{clean=H.canonical(next);}catch(e){fail(e.message);return false;}
    if(JSON.stringify(clean)===JSON.stringify(model)){$('error').hidden=true;return true;}
    undo.push(H.clone(model));if(undo.length>60)undo.shift();redo=[];model=clean;
    $('error').hidden=true;save();render();objectList();if(refreshInspector)inspect();updateButtons();return true;
  }
  function numberField(key,label,value,options={}){
    const {min=0,max=30000,step='any',wide=false}=options;
    return `<label class="field ${wide?'wide':''}"><span>${label}</span><input type="number" name="${key}" value="${value}" min="${min}" max="${max}" step="${step}" required inputmode="decimal"></label>`;
  }
  const selectField=(key,label,value,options)=>`<label class="field wide"><span>${label}</span><select name="${key}">${options.map(([v,n])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(n)}</option>`).join('')}</select></label>`;
  const nameField=obj=>`<label class="field wide"><span>Название</span><input name="name" value="${esc(obj.name)}" maxlength="100" required></label>`;
  const colorLabels={roof:'Кровля и козырёк',windowFrames:'Оконные рамы',entranceDoor:'Входная дверь',
    facade:'Фасад',foundation:'Фундамент и цоколь',columns:'Столбы террасы и входа'};
  const colorPresets=[['#474a51','RAL 7024 · Графитовый серый'],['#383e42','RAL 7016 · Антрацитовый серый'],
    ['#ddc49a','RAL 1014 · Слоновая кость'],['#e6d2b5','RAL 1015 · Светлая слоновая кость'],
    ['#f6f6f6','RAL 9016 · Транспортный белый'],['#0a0a0a','RAL 9005 · Чёрный']];
  function colorCaption(color){
    const preset=colorPresets.find(([hex])=>hex===color.toLowerCase());
    return (preset?preset[1].split(' · ')[0]+' · ':'')+color.toUpperCase();
  }
  function colorField(key,label,value){
    const color=value.toLowerCase(),known=colorPresets.some(([hex])=>hex===color);
    return `<div class="field wide color-field"><label for="color-${key}">${label}</label><div class="color-controls"><input type="color" id="color-${key}" name="${key}" value="${color}" data-color-key="${key}"><select id="color-preset-${key}" name="preset_${key}" data-color-preset="${key}" aria-label="Оттенок RAL: ${label}">${colorPresets.map(([hex,name])=>`<option value="${hex}" ${hex===color?'selected':''}>${name}</option>`).join('')}<option value="custom" ${known?'':'selected'}>Свой цвет</option></select></div><small id="color-value-${key}">${colorCaption(color)}</small></div>`;
  }
  function syncColorControls(event){
    if(selection.type!=='colors')return;
    const data=event?.target?.dataset,key=data?.colorKey||data?.colorPreset;
    if(!Object.prototype.hasOwnProperty.call(H.defaultColors,key))return;
    const input=$('color-'+key),preset=$('color-preset-'+key);
    if(data.colorPreset&&event.target.value!=='custom')input.value=event.target.value;
    preset.value=colorPresets.some(([hex])=>hex===input.value.toLowerCase())?input.value.toLowerCase():'custom';
    $('color-value-'+key).textContent=colorCaption(input.value);
  }
  const houseLabels={width:'Ширина дома, мм',depth:'Глубина дома, мм',split:'Двухэтажная часть, мм',kitchenDepth:'Глубина кухни, мм',ceiling:'Потолок 1 этажа, мм',slab:'Перекрытие, мм',atticLow:'Низ аттика, мм',atticHigh:'Верх аттика, мм',kitchenEave:'Низ крыши кухни, мм',kitchenRise:'Подъём крыши кухни, мм',roofThickness:'Толщина кровли, мм',overhang:'Свес кровли, мм',base:'Высота цоколя, мм',terraceDrop:'Перепад основания террасы, мм',facadeProjection:'Выступ фасада наружу, мм'};
  const porchLabels={roofWidth:'Ширина крыши, мм',roofDepth:'Вылет от фасада, мм',roofAngle:'Уклон от стены, °',
    roofHeight:'Высота низа у стены, мм',roofThickness:'Толщина крыши, мм',roofOffsetX:'Смещение крыши вправо, мм'};
  function porchSummary(){
    const roof=H.porchRoofGeometry(model);
    return `Низ переднего края: ${f(roof.bottom(roof.y1))} мм. Свесы: слева ${f(roof.overhangLeft)} мм, справа ${f(roof.overhangRight)} мм, спереди ${f(roof.overhangFront)} мм.`;
  }
  function showPorch(){
    mode='all';document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode==='all')));
    view3d?.setMode('all',false);view3d?.focusPorch();
  }
  function objectList(){
    const opts=[['house:house','Дом и крыша'],['colors:colors','Цвета дома'],['stair:stair','Лестница'],['porch:porch','Крыльцо']];
    const groups=[['Общие размеры',opts],['Стены',model.walls.map(w=>['wall:'+w.id,w.name])],['Окна и двери',model.openings.map(o=>['opening:'+o.id,`${o.name} · ${o.floor} эт.`])]];
    $('object').innerHTML=groups.map(([label,options])=>`<optgroup label="${label}">${options.map(([value,name])=>`<option value="${esc(value)}">${esc(name)}</option>`).join('')}</optgroup>`).join('');
    $('object').value=selection.type+':'+selection.id;
  }
  function inspect(){
    clearTimeout(timer);objectList();let html='';
    $('parameter-unit').textContent=selection.type==='colors'?'RAL / HEX':'мм';
    if(selection.type==='house'){
      const h=model.house;
      html='<p>Ширина и глубина пропорционально масштабируют план, толщины стен и проёмы. Высоты задаются отдельно. Размер части дома перемещает границу между объёмами.</p><div class="fields">';
      for(const key of ['width','depth','split','kitchenDepth'])html+=numberField(key,houseLabels[key],h[key],{min:H.limits[key][0],max:H.limits[key][1]});
      html+='</div><details><summary>Высоты, кровля и основание</summary><div class="fields">';
      for(const key of Object.keys(houseLabels).slice(4))html+=numberField(key,houseLabels[key],h[key],{min:H.limits[key][0],max:H.limits[key][1]});
      html+='</div></details>';
    }else if(selection.type==='colors'){
      const colors=H.colorSettings(model);
      html='<p>Выберите готовый оттенок RAL или нажмите цветной образец, чтобы задать свой цвет. Изменения сразу видны на модели и фасадах.</p><div class="fields">';
      for(const [key,label] of Object.entries(colorLabels))html+=colorField(key,label,colors[key]);
      html+='</div><button type="button" id="colors-reset">Вернуть заданную палитру</button>';
    }else if(selection.type==='wall'){
      const w=model.walls.find(w=>w.id===selection.id),ax=H.wallAxis(w);
      html='<div class="fields">'+nameField(w);
      html+=numberField('thickness','Толщина, мм',ax.hi-ax.lo,{min:50,max:1000});
      if(!w.exterior){
        html+=numberField('length','Длина, мм',ax.end-ax.start,{min:200});
        html+=numberField('x','Начало X, мм',w.x1)+numberField('y','Начало Y, мм',w.y1);
        html+=selectField('axis','Направление',w.axis,[['x','Вдоль X →'],['y','Вдоль Y ↓']]);
        html+=numberField('height','Высота, мм · 0 = до потолка',w.height,{max:10000,wide:true});
      }
      html+='</div><p>'+(w.exterior?'Наружный контур и длина этой стены задаются в разделе «Дом и крыша». Толщина откладывается внутрь дома.':'Начало стены измеряется от левого верхнего угла дома на плане. Проёмы перемещаются вместе со стеной.')+'</p>';
    }else if(selection.type==='opening'){
      const o=model.openings.find(o=>o.id===selection.id);
      html='<div class="fields">'+nameField(o)+selectField('kind','Тип',o.kind,[['window','Окно'],['door','Дверь'],['glazedDoor','Остеклённая дверь'],['passage','Открытый проём']]);
      html+=selectField('wallId','Стена',o.wallId,model.walls.map(w=>[w.id,w.name]));
      html+=selectField('floor','Этаж',o.floor,[[1,'1 этаж'],[2,'2 этаж']]);
      html+=numberField('width','Ширина, мм',o.width,{min:250})+numberField('height','Высота максимум, мм',o.height,{min:250});
      html+=numberField('offset','От начала стены, мм',o.offset)+numberField('sill','От пола этажа, мм',o.sill);
      html+=selectField('shape','Верх проёма',o.shape,[['rect','Горизонтальный'],['rake','Наклонный с изломом']]);
      if(o.shape==='rake')html+=numberField('rakeDrop','Понижение слева, мм',o.rakeDrop)+numberField('corner','Точка излома, % ширины',o.corner*100,{min:10,max:100});
      if(o.kind==='window'||o.kind==='glazedDoor')html+=numberField('thickness','Толщина окна, мм',o.thickness,{min:20,max:300});
      html+=numberField('panels','Количество створок',o.panels,{min:1,max:4,step:1});
      html+='</div><p>Отступ отсчитывается слева направо для горизонтальной стены и сверху вниз для вертикальной. Высота задаётся до самой высокой точки проёма.</p>';
    }else if(selection.type==='stair'){
      const s=model.stair;
      html='<div class="fields">'+numberField('x','Начало X, мм',s.x)+numberField('y','Начало Y, мм',s.y)+numberField('length','Длина в плане, мм',s.length,{min:1000})+numberField('width','Ширина марша, мм',s.width,{min:500})+numberField('steps','Подъёмов',s.steps,{min:8,max:30,step:1})+'</div><p>Высота лестницы привязана к полу второго этажа. Проём перекрытия перестраивается вместе с маршем.</p>';
    }else{
      const p=H.porchSettings(model);
      html='<p>Площадка крыльца</p><div class="fields">'+numberField('x','Начало X, мм',p.x)+numberField('width','Ширина площадки, мм',p.width,{min:600})+numberField('depth','Глубина площадки, мм',p.depth,{min:300,max:3000})+'</div>';
      html+='<details open><summary>Односкатная крыша входа</summary><div class="fields">';
      for(const key of Object.keys(porchLabels))html+=numberField(key,porchLabels[key],p[key],{min:H.porchLimits[key][0],max:H.porchLimits[key][1]});
      html+='</div><p>Скат направлен от стены к ступеням. Размеры крыши независимы от площадки; опоры подстраиваются под уклон. Отрицательное смещение сдвигает крышу влево.</p><p id="porch-roof-summary">'+porchSummary()+'</p></details><button type="button" id="porch-focus">Показать вход в 3D</button>';
    }
    $('properties').innerHTML=html;
    if(selection.type==='colors')$('colors-reset').onclick=()=>{const next=H.clone(model);next.colors=H.clone(H.defaultColors);commit(next,true);};
    if(selection.type==='porch')$('porch-focus').onclick=showPorch;
    const canDelete=selection.type==='opening'||(selection.type==='wall'&&!model.walls.find(w=>w.id===selection.id).exterior);
    $('delete').hidden=!canDelete;$('error').hidden=true;
  }
  function readFields(){
    const values={};
    for(const input of $('properties').querySelectorAll('input,select')){
      if(!input.checkValidity()){fail('Проверьте выделенное поле. Изменение пока не применено.');return null;}
      values[input.name]=input.type==='number'?Number(input.value):input.value;
    }return values;
  }
  function applyFields(){
    const values=readFields();if(!values)return;
    let next=H.clone(model),refresh=false;
    if(selection.type==='house'){
      const old=model.house;
      if(values.width!==old.width&&values.split===old.split)values.split=H.round(old.split*values.width/old.width);
      if(values.depth!==old.depth&&values.kitchenDepth===old.kitchenDepth)values.kitchenDepth=H.round(old.kitchenDepth*values.depth/old.depth);
      next=H.resizeHouse(model,values);
    }else if(selection.type==='colors'){
      next.colors=Object.fromEntries(Object.keys(H.defaultColors).map(key=>[key,values[key]]));
    }else if(selection.type==='wall'){
      const w=next.walls.find(w=>w.id===selection.id),old=H.wallAxis(w);
      w.name=values.name;
      if(w.exterior){
        if(['left','front','kf'].includes(w.id)){if(w.axis==='x')w.y2=w.y1+values.thickness;else w.x2=w.x1+values.thickness;}
        else {if(w.axis==='x')w.y1=w.y2-values.thickness;else w.x1=w.x2-values.thickness;}
      }else{
        w.axis=values.axis;w.height=values.height;w.x1=values.x;w.y1=values.y;
        w.x2=w.x1+(w.axis==='x'?values.length:values.thickness);w.y2=w.y1+(w.axis==='y'?values.length:values.thickness);
      }
      // Keep perpendicular joins flush when only the wall thickness changes.
      const original=model.walls.find(item=>item.id===w.id),updated=H.wallAxis(w);
      if(w.axis===original.axis&&updated.start===old.start&&updated.end===old.end){
        for(const other of next.walls.filter(item=>item.id!==w.id&&item.axis!==w.axis)){
          const oa=H.wallAxis(other);
          if(oa.hi<old.start||oa.lo>old.end)continue;
          const before=oa.start,keys=other.axis==='x'?['x1','x2']:['y1','y2'];
          for(const key of keys){if(Math.abs(other[key]-old.lo)<.1)other[key]=updated.lo;else if(Math.abs(other[key]-old.hi)<.1)other[key]=updated.hi;}
          const delta=before-H.wallAxis(other).start;
          for(const o of next.openings.filter(item=>item.wallId===other.id))o.offset=H.round(o.offset+delta);
        }
      }
    }else if(selection.type==='opening'){
      const o=next.openings.find(o=>o.id===selection.id);refresh=o.shape!==values.shape;
      Object.assign(o,values,{floor:Number(values.floor)});
      if('corner' in values)o.corner=values.corner/100;
      if(o.kind==='door'||o.kind==='passage')o.shape='rect';
    }else Object.assign(next[selection.type],values);
    if(commit(next,refresh)&&selection.type==='house'){
      for(const key of ['split','kitchenDepth']){const input=$('properties').querySelector(`[name="${key}"]`);if(input&&document.activeElement!==input)input.value=model.house[key];}
    }
  }
  function select(item){
    clearTimeout(timer);selection=item;
    if(item.type==='opening')view=model.openings.find(o=>o.id===item.id).floor===2?'plan2':'plan1';
    if(item.type==='wall'){const w=model.walls.find(w=>w.id===item.id);if(w.floor===2)view='plan2';else if(w.floor===1)view='plan1';}
    if(item.type==='porch')view='plan1';
    $('drawing-view').value=view;inspect();draw();view3d?.select(selection);
  }
  function draw(){
    $('drawing').innerHTML=HouseDrawings.draw(model,view,selection);
    setZoom(zoom);
    const o=selection.type==='opening'?model.openings.find(o=>o.id===selection.id):null;
    const w=selection.type==='wall'?model.walls.find(w=>w.id===selection.id):null;
    $('drawing-caption').textContent=o?`${o.name} · ${f(o.width)} × ${f(o.height)} мм · отступ ${f(o.offset)} мм`:w?`${w.name} · длина ${f(H.wallAxis(w).end-H.wallAxis(w).start)} мм · толщина ${f(H.wallAxis(w).hi-H.wallAxis(w).lo)} мм`:'Нажмите на стену или проём. Размеры показаны в миллиметрах. X →, Y ↓.';
  }
  function setZoom(value){
    zoom=Math.max(.75,Math.min(3,value));
    const svg=$('drawing').querySelector('svg');if(svg){svg.style.width=zoom*100+'%';svg.style.height=zoom*100+'%';}
    $('zoom-value').textContent=Math.round(zoom*100)+'%';
  }
  function render(){
    const h=model.house;
    $('title').textContent=`Дом ${(h.width/1000).toLocaleString('ru-RU')} × ${(h.depth/1000).toLocaleString('ru-RU')}`;
    $('summary').textContent=`${f(h.width)} × ${f(h.depth)} мм · две части ${f(h.split)} + ${f(h.width-h.split)} мм`;
    $('metrics').innerHTML=`<span>Пятно застройки <strong>${(h.width*h.depth/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})} м²</strong></span><span>Терраса <strong>${((h.width-h.split)*(h.depth-h.kitchenDepth)/1e6).toLocaleString('ru-RU',{maximumFractionDigits:2})} м²</strong></span><span>Основание террасы <strong>−${h.terraceDrop} мм</strong></span><span>Пол 2 этажа <strong>+${f(H.floorZ(model,2))} мм</strong></span>`;
    draw();
    const roofSummary=$('porch-roof-summary');if(roofSummary)roofSummary.textContent=porchSummary();
    if(view3d){try{view3d.update(model);view3d.select(selection);}catch(e){$('model-message').textContent='Ошибка построения 3D. '+e.message;$('model-message').hidden=false;console.error(e);}}
  }
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
  function uniqueId(prefix){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  function addOpening(kind){
    const selectedWall=selection.type==='wall'?model.walls.find(w=>w.id===selection.id):selection.type==='opening'?model.walls.find(w=>w.id===model.openings.find(o=>o.id===selection.id).wallId):null;
    if(!selectedWall){toast('Выберите стену на плане или в списке, затем добавьте окно или дверь.');return;}
    const floor=selectedWall.floor|| (view==='plan2'?2:1),length=H.wallAxis(selectedWall).end-H.wallAxis(selectedWall).start;
    const o={id:uniqueId('o'),name:kind==='window'?'Новое окно':'Новая дверь',wallId:selectedWall.id,offset:100,width:kind==='window'?800:900,sill:kind==='window'?900:0,height:kind==='window'?1000:2100,kind,floor,shape:'rect',rakeDrop:0,corner:.6875,panels:1,thickness:70};
    for(let offset=100;offset+o.width<=length-50;offset+=100){
      const next=H.clone(model);o.offset=offset;next.openings.push({...o});
      if(!H.validate(next).length){if(commit(next))select({type:'opening',id:o.id});return;}
    }
    toast('На этой стене нет места для нового проёма стандартного размера. Освободите место или выберите другую стену.');
  }
  $('properties').addEventListener('input',event=>{syncColorControls(event);clearTimeout(timer);timer=setTimeout(applyFields,450);});
  $('properties').addEventListener('change',event=>{syncColorControls(event);clearTimeout(timer);applyFields();});
  $('object').addEventListener('change',event=>{const [type,id]=event.target.value.split(':');select({type,id});});
  $('drawing-view').addEventListener('change',event=>{view=event.target.value;draw();});
  $('drawing').addEventListener('click',event=>{const e=event.target.closest('[data-id]');if(e)select({type:e.dataset.type,id:e.dataset.id});});
  $('drawing').addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){const e=event.target.closest('[data-id]');if(e){event.preventDefault();select({type:e.dataset.type,id:e.dataset.id});}}});
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.mode;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));view3d?.setMode(mode);}));
  $('undo').onclick=()=>{clearTimeout(timer);if(!undo.length)return;redo.push(H.clone(model));model=undo.pop();selection={type:'house',id:'house'};save();render();inspect();updateButtons();};
  $('redo').onclick=()=>{clearTimeout(timer);if(!redo.length)return;undo.push(H.clone(model));model=redo.pop();selection={type:'house',id:'house'};save();render();inspect();updateButtons();};
  $('export').onclick=()=>download('dom-project.json',JSON.stringify(model,null,2),'application/json');
  $('svg-export').onclick=()=>download('dom-'+view+'.svg',HouseDrawings.draw(model,view,null),'image/svg+xml');
  $('zoom-in').onclick=()=>setZoom(zoom+.25);$('zoom-out').onclick=()=>setZoom(zoom-.25);$('zoom-reset').onclick=()=>setZoom(1);
  $('import').onclick=()=>$('file').click();
  $('file').onchange=async event=>{
    const file=event.target.files[0];if(!file)return;
    try{if(file.size>1e6)throw new Error('Файл должен быть меньше 1 МБ.');const next=H.canonical(JSON.parse(await file.text()));if(commit(next)){select({type:'house',id:'house'});toast('Проект загружен.');}}
    catch(e){toast('Проект не загружен. '+e.message);}event.target.value='';
  };
  $('reset').onclick=()=>{if(confirm('Вернуть исходный дом 9 × 8? Текущий вариант можно заранее скачать в JSON.')){commit(H.initial);select({type:'house',id:'house'});}};
  $('add-window').onclick=()=>addOpening('window');$('add-door').onclick=()=>addOpening('door');
  $('add-wall').onclick=()=>{
    const next=H.clone(model),id=uniqueId('w'),floor=view==='plan2'?2:1;
    const x1=H.round(model.house.split*.3),y1=H.round(model.house.depth*.4);
    next.walls.push({id,name:'Новая перегородка',axis:'x',x1,y1,x2:x1+1000,y2:y1+100,floor,roof:floor===2?'main':'ceiling',exterior:false,height:0});
    if(commit(next))select({type:'wall',id});
  };
  $('delete').onclick=()=>{
    const next=H.clone(model);
    if(selection.type==='wall'){
      const w=next.walls.find(w=>w.id===selection.id);if(w.exterior)return;
      if(next.openings.some(o=>o.wallId===w.id)&&!confirm('Удалить перегородку вместе с её проёмами?'))return;
      next.walls=next.walls.filter(item=>item.id!==w.id);next.openings=next.openings.filter(o=>o.wallId!==w.id);
    }else if(selection.type==='opening')next.openings=next.openings.filter(o=>o.id!==selection.id);
    if(commit(next))select({type:'house',id:'house'});
  };
  // An explicit project link imports a saved variant once; undo restores the
  // previous browser project, and refresh keeps subsequent user edits.
  const projectUrl=new URL(location.href),projectName=projectUrl.searchParams.get('project');
  if(projectName&&/^[a-z0-9-]{1,64}$/.test(projectName)){
    try{
      const response=await fetch('projects/'+projectName+'.json',{cache:'no-store'});
      if(!response.ok)throw new Error('Не удалось открыть проект по ссылке.');
      const next=H.canonical(await response.json());
      undo.push(H.clone(model));model=next;save();
      projectUrl.searchParams.delete('project');history.replaceState(null,'',projectUrl.href);
      toast('Проект открыт. Предыдущий вариант можно вернуть кнопкой «Отменить».');
    }catch(e){toast('Проект по ссылке не загружен. '+e.message);}
  }
  if(projectUrl.searchParams.get('edit')==='window12-like13'){
    try{
      if(commit(H.alignUpperWindows(model))){
        projectUrl.searchParams.delete('edit');projectUrl.searchParams.set('opening','o12');
        history.replaceState(null,'',projectUrl.href);
        toast('Окна 12 и 13: излом на 50%, наклон параллелен крыше. Изменение можно отменить.');
      }
    }catch(e){toast('Окна не изменены. '+e.message);}
  }
  try{view3d=createHouseView($('model'),select);}catch(e){$('model-message').textContent='3D недоступно в этом браузере. '+e.message;$('model-message').hidden=false;}
  inspect();render();updateButtons();
  const requestedOpening=projectUrl.searchParams.get('opening');
  if(model.openings.some(o=>o.id===requestedOpening))select({type:'opening',id:requestedOpening});
  if(projectUrl.searchParams.get('object')==='porch'){select({type:'porch',id:'porch'});showPorch();}
  if(projectUrl.searchParams.get('object')==='colors')select({type:'colors',id:'colors'});
  // Read-only snapshot for diagnostics and acceptance checks.
  window.houseEditor={snapshot:()=>H.clone(model),getSelection:()=>({...selection})};
})();
