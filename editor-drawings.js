(function(global){
  'use strict';
  const H=global.HouseModel;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Math.round(n).toLocaleString('ru-RU');
  const css=`.wall{fill:#d9dfdc;stroke:#354640;stroke-width:1.2}.selected{fill:#b5e2d7;stroke:#147d69;stroke-width:2}.opening{fill:#e6f1f5;stroke:#48798a;stroke-width:1.4}.door{fill:#fff;stroke:#9a754c;stroke-width:1.4}.fine{fill:none;stroke:#889790;stroke-width:.7}.canopy{fill:none;stroke:#53615d;stroke-width:1;stroke-dasharray:6 4}.canopy.selected{stroke:#147d69;stroke-width:2}.porch-post{fill:#f3f1e9;stroke:#8b9992;stroke-width:.7}.roof{fill:#d7dddd;stroke:#53615d;stroke-width:1}.plinth{fill:#8f9395;stroke:#53615d;stroke-width:1}.terrace-plan{fill:#e6f1f5;stroke:#474a51;stroke-width:1}.terrace-post{fill:#474a51;stroke:#354640;stroke-width:.7}.terrace-door{fill:none;stroke:#474a51;stroke-width:1.2}.floor{fill:#f0eee8;stroke:#a8afa9;stroke-width:1}.dim{fill:none;stroke:#647970;stroke-width:.7}.accent{fill:none;stroke:#147d69;stroke-width:1.5}text{font-family:system-ui,sans-serif;fill:#354640;font-size:180px} .dimension{font-size:185px;paint-order:stroke;stroke:#fff;stroke-width:65px;stroke-linejoin:round}.label{font-size:150px}.room-name{paint-order:stroke;stroke:#f0eee8;stroke-width:45px;stroke-linejoin:round}.room-area{font-size:175px;font-weight:600;fill:#147d69;paint-order:stroke;stroke:#f0eee8;stroke-width:40px}.room-size{font-size:145px;paint-order:stroke;stroke:#fff;stroke-width:45px;stroke-linejoin:round}.room-dim{fill:none;stroke:#75877f;stroke-width:.6}.hit{cursor:pointer}path,line,rect,polygon{vector-effect:non-scaling-stroke}.hit:focus{outline:none;stroke:#147d69;stroke-width:3}`;
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
  function terracePlan(m,selection){
    const g=H.terraceGeometry(m);if(!g.p.enabled)return '';
    const selected=selection?.type==='terrace'?'selected':'';
    let out=`<g class="hit" ${attr('terrace',{id:'terrace',name:'Остекление террасы'})}>`;
    for(const surface of g.surfaces){
      const d=g.p.frameDepth;
      out+=surface.axis==='x'?rect(surface.a,surface.normal-d/2,surface.b-surface.a,d,`terrace-plan ${selected}`):rect(surface.normal-d/2,surface.a,d,surface.b-surface.a,`terrace-plan ${selected}`);
    }
    for(const post of g.posts)out+=rect(post.x1,post.y1,post.x2-post.x1,post.y2-post.y1,'terrace-post');
    const d=g.door,w=d.b-d.a;
    out+=rect(d.a,d.normal-g.p.frameDepth/2,w,g.p.frameDepth,'floor');
    out+=line(d.a,d.normal,d.b,d.normal,'terrace-door');
    out+=line(d.a,d.normal,d.a,d.normal+w,'terrace-door');
    out+=`<path d="M ${d.b},${d.normal} A ${w},${w} 0 0 1 ${d.a},${d.normal+w}" class="fine" data-terrace-entry="true"/>`;
    out+=text((d.a+d.b)/2,d.normal-180,'Стеклянная дверь');
    if(selection?.type==='terrace')out+=dimX(d.a,d.b,d.normal+500,d.normal);
    return out+'</g>';
  }
  function plan(m,floor,selection){
    const h=m.house,z=H.floorZ(m,floor),st=m.stair,canopy=H.porchRoofGeometry(m),terrace=H.terraceGeometry(m);
    let out='';
    out+=rect(0,0,h.split,h.depth,'floor');
    out+=rect(h.split,0,h.width-h.split,h.kitchenDepth,floor===1?'floor':'roof');
    out+=rect(h.split,h.kitchenDepth,h.width-h.split,h.depth-h.kitchenDepth,'floor');
    if(terrace.p.enabled){
      const cx=(terrace.inner.x1+terrace.inner.x2)/2,cy=(terrace.inner.y1+terrace.inner.y2)/2;
      out+=text(cx,cy-150,floor===1?'Остеклённая терраса':'Терраса · 1 этаж');
      out+=text(cx,cy+75,terrace.area.toLocaleString('ru-RU',{minimumFractionDigits:2,maximumFractionDigits:2})+' м²','room-area',`data-terrace-area="${terrace.area}"`);
      out+=text(cx,cy+290,`Основание −${h.terraceDrop} мм`);
    }else out+=text((h.split+h.width)/2,(h.depth+h.kitchenDepth)/2,`Терраса · основание −${h.terraceDrop} мм`);
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
    if(floor===1)out+=terracePlan(m,selection);
    const bottomOffset=terrace.p.enabled&&floor===1?Math.max(400,terrace.p.doorWidth+250):400;
    out+=dimX(0,h.width,Math.min(-m.porch.depth,canopy.y1)-400,0)+dimX(0,h.split,h.depth+bottomOffset,h.depth)+dimX(h.split,h.width,h.depth+bottomOffset,h.depth);
    out+=dimY(0,h.depth,-450,0)+dimY(0,h.kitchenDepth,h.width+450,h.width)+dimY(h.kitchenDepth,h.depth,h.width+450,h.width);
    out+=text(h.width/2,h.depth+bottomOffset+550,`${floor} этаж · пол ${z===0?'±0,000':'+'+(z/1000).toFixed(3)} м · расстояния между стенами, мм · площади в м²`);
    out+=text(h.width/2,h.depth+bottomOffset+1000,floor===2?'Площади по полу; лестничный проём исключён.':'Площади по полу; лестница включена в площадь холла.');
    const e=h.facadeProjection??121;
    if(e){
      out+=dimX(-e,h.width+e,Math.min(-m.porch.depth,canopy.y1)-750,-e);
      out+=dimY(-e,h.depth+e,-850,-e);
      out+=text(h.width/2,h.depth+bottomOffset+800,`Выступ фасада наружу: ${fmt(e)} мм с каждой внешней стороны`);
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

  function openingFinishes(m,o,selection){
    const finish=H.openingFinishGeometry(m,o);if(!finish)return '';
    const c=finish.casing,selected=chosen(selection,'opening',o.id)?'selected':'';
    const path=points=>'M '+points.map(([u,z])=>u+','+(-z)).join(' L ')+' Z ';
    const outline=c.polygon?path(c.polygon):path(c.outer)+path(c.inner);
    let out=`<path d="${outline}" fill-rule="evenodd" class="exterior-casing hit ${selected}" data-casing-id="${esc(o.id)}" ${attr('opening',o)}/>`;
    if(finish.sill){
      const sill=finish.sill,lo=Math.min(...sill.profile.map(p=>p[1])),hi=Math.max(...sill.profile.map(p=>p[1]));
      out+=rect(sill.a,-hi,sill.b-sill.a,hi-lo,`exterior-sill hit ${selected}`,`data-sill-id="${esc(o.id)}" ${attr('opening',o)}`);
    }
    return out;
  }
  function terraceElevation(m,view,selection){
    if(view!=='back'&&view!=='right')return '';
    const g=H.terraceGeometry(m),selected=selection?.type==='terrace'?'selected':'';
    const axis=view==='back'?'x':'y';
    let out=`<g class="hit" ${attr('terrace',{id:'terrace',name:'Терраса и стеклянная дверь'})}>`;
    const panel=(item,cls)=>{
      const bottom=typeof item.bottom==='function'?item.bottom:()=>item.bottom;
      return poly([[item.a,bottom(item.a)],[item.b,bottom(item.b)],[item.b,item.top(item.b)],[item.a,item.top(item.a)]].map(p=>elevationPoint(...p)),cls);
    };
    if(g.p.enabled){
      for(const item of g.glass.filter(o=>o.axis===axis))out+=panel(item,`terrace-glass ${selected}`);
      if(view==='back')out+=panel(g.door.glass,`terrace-glass ${selected}`);
      for(const item of g.frames.filter(o=>o.axis===axis))out+=panel(item,`terrace-frame ${selected}`);
      if(view==='back'){
        for(const item of g.door.frames)out+=panel(item,`terrace-frame ${selected}`);
        out+=rect(g.door.a,-g.floor-20,g.door.b-g.door.a,20,'terrace-frame');
        out+=rect(g.door.b-100,-g.floor-1150,20,250,'terrace-frame','data-terrace-entry="true"');
        out+=text((g.door.a+g.door.b)/2,-g.floor-350,`${fmt(g.p.doorWidth)} × ${fmt(g.p.doorHeight)}`,'room-size');
      }
    }
    if(view==='back')for(const post of g.posts)out+=poly([[post.x1,g.floor],[post.x2,g.floor],[post.x2,H.lowTop(m,post.x2)],[post.x1,H.lowTop(m,post.x1)]].map(p=>elevationPoint(...p)),'terrace-post');
    else{
      const post=g.posts[1];out+=rect(post.y1,-H.lowTop(m,post.x2),post.y2-post.y1,H.lowTop(m,post.x2)-g.floor,'terrace-post');
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
        out+=openingFinishes(m,o,selection);
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
    out+=terraceElevation(m,view,selection);
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
    const t=H.terraceSettings(m),bottomOffset=t.enabled&&view==='plan1'?Math.max(400,t.doorWidth+250):400;
    const maxY=planView?h.depth+bottomOffset+1250:h.base+1300;
    const box=[minX,minY,maxX-minX,maxY-minY];
    const colors=H.colorSettings(m);
    const finishes=planView||view==='section'?'':`.wall{fill:${colors.facade}}.roof{fill:${colors.roof}}.plinth{fill:${colors.foundation}}.porch-post{fill:${colors.columns}}.exterior-window{stroke:${colors.windowFrames};stroke-width:2}.exterior-sash{stroke:${colors.windowFrames};stroke-width:2}.exterior-door{fill:${colors.entranceDoor};stroke:${colors.entranceDoor}}.exterior-casing{fill:${colors.casings};stroke:${colors.casings};stroke-width:.6}.exterior-sill{fill:${colors.sills};stroke:${colors.sills};stroke-width:.6}.terrace-frame{fill:${colors.terraceGlazing};stroke:${colors.terraceGlazing};stroke-width:.6}.terrace-glass{fill:${colors.terraceGlazing};fill-opacity:${t.glassOpacity};stroke:${colors.terraceGlazing};stroke-opacity:.5;stroke-width:.6}.terrace-post{fill:${colors.columns}}.selected{fill:#b5e2d7;stroke:#147d69}`;
    const content=planView?plan(m,view==='plan1'?1:2,selection):view==='section'?section(m):elevation(m,view,selection);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img" aria-label="Редактируемый чертёж дома"><style>${css}${finishes}</style><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="white"/>${content}</svg>`;
  }
  global.HouseDrawings={draw};
})(window);
