/* Shared geometry, in millimetres. X runs across the plan, Y from entrance to terrace. */
(function (global) {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const round = value => Math.round(value * 10) / 10;
  const house = {width:9000, depth:8000, split:5075, kitchenDepth:6000,
    ceiling:2700, slab:200, atticLow:1200, atticHigh:3271, kitchenEave:2900,
    kitchenRise:1609.25, roofThickness:250, overhang:350, base:350, terraceDrop:50, facadeProjection:121};
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
      rakeDrop:shape==='rake'?448.9:0, corner:.6875, panels:kind==='glazedDoor'?3:width>=1500?2:1, thickness:70});
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
    porch:{x:2100,width:1400,depth:1200}};
  const limits={width:[5000,20000],depth:[5000,20000],split:[2500,14000],kitchenDepth:[2500,18000],
    ceiling:[2200,4500],slab:[100,500],atticLow:[600,3000],atticHigh:[1800,6000],
    kitchenEave:[2200,5000],kitchenRise:[0,4000],roofThickness:[100,600],overhang:[0,1200],base:[150,1200],terraceDrop:[0,250],facadeProjection:[0,1200]};
  const floorZ=(m,f)=>f===2?m.house.ceiling+m.house.slab:0;
  const mainTop=(m,x)=>floorZ(m,2)+m.house.atticLow+(m.house.atticHigh-m.house.atticLow)*x/m.house.split;
  const lowTop=(m,x)=>m.house.kitchenEave+m.house.kitchenRise*(m.house.width-x)/(m.house.width-m.house.split);
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
    m.porch.width=round(mx(m.porch.x+m.porch.width)-mx(m.porch.x));m.porch.x=round(mx(m.porch.x));
    m.house=next;return m;
  }
  function validate(m) {
    const errors=[];
    const validNumber=v=>typeof v==='number'&&Number.isFinite(v);
    if(!m||m.schema!=='dom-editor'||m.version!==1||!m.house||!Array.isArray(m.walls)||!Array.isArray(m.openings))return ['Неизвестный формат проекта. Нужен JSON из этого редактора.'];
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
    return [...new Set(errors)];
  }
  function canonical(value) {
    const errors=validate(value);if(errors.length)throw new Error(errors.slice(0,4).join('\n'));
    // Whitelist imported fields; no embedded markup, callbacks, or unknown state is retained.
    const pick=(obj,keys)=>Object.fromEntries(keys.map(k=>[k,obj[k]]));
    return {schema:'dom-editor',version:1,house:pick({facadeProjection:121,...value.house},Object.keys(house)),
      walls:value.walls.map(w=>pick(w,Object.keys(walls[0]))),
      openings:value.openings.map(o=>pick({thickness:70,...o},Object.keys(openings[0]))),
      stair:pick(value.stair,Object.keys(initial.stair)),porch:pick(value.porch,Object.keys(initial.porch))};
  }
  const api={initial,clone,round,limits,floorZ,mainTop,lowTop,wallAxis,wallTop,facadeWalls,openingFace,openingGeometry,openingPlacement,resizeHouse,validate,canonical};
  global.HouseModel=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
