(function(global){
  'use strict';
  const H=global.HouseModel;
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=n=>Math.round(n).toLocaleString('ru-RU');
  const css=`.wall{fill:#d9dfdc;stroke:#354640;stroke-width:1.2}.selected{fill:#b5e2d7;stroke:#147d69;stroke-width:2}.opening{fill:#e6f1f5;stroke:#48798a;stroke-width:1.4}.door{fill:#fff;stroke:#9a754c;stroke-width:1.4}.fine{fill:none;stroke:#889790;stroke-width:.7}.roof{fill:#d7dddd;stroke:#53615d;stroke-width:1}.floor{fill:#f0eee8;stroke:#a8afa9;stroke-width:1}.dim{fill:none;stroke:#647970;stroke-width:.7}.accent{fill:none;stroke:#147d69;stroke-width:1.5}text{font-family:system-ui,sans-serif;fill:#354640;font-size:180px} .dimension{font-size:185px;paint-order:stroke;stroke:#fff;stroke-width:65px;stroke-linejoin:round}.label{font-size:150px}.hit{cursor:pointer}path,line,rect,polygon{vector-effect:non-scaling-stroke}.hit:focus{outline:none;stroke:#147d69;stroke-width:3}`;
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
  function plan(m,floor,selection){
    const h=m.house,z=H.floorZ(m,floor),st=m.stair;
    let out='';
    out+=rect(0,0,h.split,h.depth,'floor');
    out+=rect(h.split,0,h.width-h.split,h.kitchenDepth,floor===1?'floor':'roof');
    out+=rect(h.split,h.kitchenDepth,h.width-h.split,h.depth-h.kitchenDepth,'floor');
    out+=text((h.split+h.width)/2,(h.depth+h.kitchenDepth)/2,`Терраса · основание −${h.terraceDrop} мм`);
    out+=rect(m.porch.x,-m.porch.depth,m.porch.width,m.porch.depth,'floor');
    out+=text(m.porch.x+m.porch.width/2,-m.porch.depth/2,'Крыльцо');
    for(const w of H.facadeWalls(m).filter(w=>w.baseHeight<=z+1200&&(floor===1||w.roof!=='low')))
      out+=rect(w.x1,w.y1,w.x2-w.x1,w.y2-w.y1,'wall');
    const active=m.walls.filter(w=>(w.floor===0||w.floor===floor)&&(floor===1||w.roof!=='low'));
    for(const w of active)out+=rect(w.x1,w.y1,w.x2-w.x1,w.y2-w.y1,`wall hit ${chosen(selection,'wall',w.id)?'selected':''}`,attr('wall',w));
    for(const o of m.openings.filter(o=>o.floor===floor)){
      const {w,ax,a,b}=H.openingGeometry(m,o),horizontal=w.axis==='x',thick=ax.hi-ax.lo;
      const x=horizontal?a:ax.lo,y=horizontal?ax.lo:a,ww=horizontal?b-a:thick,hh=horizontal?thick:b-a;
      const cls=o.kind==='door'||o.kind==='passage'?'door':'opening';
      out+=rect(x,y,ww,hh,`${cls} hit ${chosen(selection,'opening',o.id)?'selected':''}`,attr('opening',o));
      if(o.kind==='window'||o.kind==='glazedDoor'){
        if(horizontal)out+=line(a,(ax.lo+ax.hi)/2,b,(ax.lo+ax.hi)/2);
        else out+=line((ax.lo+ax.hi)/2,a,(ax.lo+ax.hi)/2,b);
      }
      if(o.kind==='door'){
        const depth=Math.min(o.width,900);
        out+=horizontal?line(a,ax.hi,a,ax.hi+depth):line(ax.hi,a,ax.hi+depth,a);
      }
    }
    const byId=id=>m.walls.find(w=>w.id===id);
    const left=byId('left')?.x2||0,right=byId('ridge')?.x1||h.split;
    const front=byId('front')?.y2||0,back=byId('back')?.y1||h.depth;
    const labelRoom=(name,x1,y1,x2,y2)=>{if(x2-x1>500&&y2-y1>450)out+=text((x1+x2)/2,(y1+y2)/2,name);};
    if(floor===1){
      const b=byId('bath'),u=byId('utility'),ha=byId('hall'),so=byId('south'),cl=byId('store');
      if(b?.axis==='y'&&u?.axis==='y'&&ha?.axis==='x'){
        labelRoom('С/у',left,front,b.x1,ha.y1);labelRoom('Тамбур',b.x2,front,u.x1,ha.y1);labelRoom('Техпомещение',u.x2,front,right,ha.y1);
      }
      if(so?.axis==='x'&&cl?.axis==='y'){labelRoom('Кладовая',left,so.y2,cl.x1,back);labelRoom('Спальня',cl.x2,so.y2,right,back);}
      if(ha?.axis==='x')labelRoom('Холл',left,ha.y2,right,st.y);
      labelRoom('Кухня-гостиная',h.split,front,h.width,h.kitchenDepth);
    }else{
      const first=byId('upper1'),second=byId('upper2');
      if(first?.axis==='x')labelRoom('Спальня',left,front,right,first.y1);
      if(second?.axis==='x')labelRoom('Спальня',left,second.y2,right,back);
    }
    const step=st.length/(st.steps-1);
    out+=rect(st.x,st.y,st.length,st.width,`floor hit ${chosen(selection,'stair','stair')?'selected':''}`,attr('stair',{id:'stair'}));
    for(let i=1;i<st.steps-1;i++)out+=line(st.x+step*i,st.y,st.x+step*i,st.y+st.width);
    out+=line(st.x+100,st.y+st.width/2,st.x+st.length-100,st.y+st.width/2,'accent');
    out+=poly([[st.x+st.length-100,st.y+st.width/2],[st.x+st.length-300,st.y+st.width/2-90],[st.x+st.length-300,st.y+st.width/2+90]],'opening');
    out+=dimX(0,h.width,-m.porch.depth-400,0)+dimX(0,h.split,h.depth+400,h.depth)+dimX(h.split,h.width,h.depth+400,h.depth);
    out+=dimY(0,h.depth,-450,0)+dimY(0,h.kitchenDepth,h.width+450,h.width)+dimY(h.kitchenDepth,h.depth,h.width+450,h.width);
    out+=text(h.width/2,h.depth+950,`${floor} этаж · пол ${z===0?'±0,000':'+'+(z/1000).toFixed(3)} м · размеры в мм`);
    const e=h.facadeProjection??121;
    if(e){
      out+=dimX(-e,h.width+e,-m.porch.depth-750,-e);
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
        out+=poly(shape.map(p=>elevationPoint(...p)),`${o.kind==='door'?'door':'opening'} hit ${chosen(selection,'opening',o.id)?'selected':''}`,attr('opening',o));
        if(o.kind==='window'||o.kind==='glazedDoor')for(let i=1;i<o.panels;i++){const u=g.a+o.width*i/o.panels;out+=line(u,-g.sill,u,-g.head(u));}
        out+=text((g.a+g.b)/2,-g.sill-90,`${fmt(o.width)} × ${fmt(o.height)}`,'dimension');
      }
    }
    if(view==='front'||view==='back'){
      for(const [a,b,fn] of [[-h.overhang,h.split+h.overhang,x=>H.mainTop(m,x)],[h.split,h.width+h.overhang,x=>H.lowTop(m,x)]])
        out+=poly([[a,fn(a)],[b,fn(b)],[b,fn(b)+h.roofThickness],[a,fn(a)+h.roofThickness]].map(p=>elevationPoint(...p)),'roof');
      out+=rect(0,0,h.split,h.base,'floor')+rect(h.split,view==='back'?h.terraceDrop:0,h.width-h.split,h.base-(view==='back'?h.terraceDrop:0),'floor');
    }else{
      out+=rect(-h.overhang,-top-h.roofThickness,h.depth+2*h.overhang,view==='left'?top-H.mainTop(m,0)+h.roofThickness:h.roofThickness,'roof');
      if(view==='right')out+=rect(-h.overhang,-H.lowTop(m,h.split)-h.roofThickness,h.depth+2*h.overhang,H.lowTop(m,h.split)-H.lowTop(m,h.width)+h.roofThickness,'roof');
      out+=rect(0,0,view==='right'?h.kitchenDepth:width,h.base,'floor');
      if(view==='right')out+=rect(h.kitchenDepth,h.terraceDrop,h.depth-h.kitchenDepth,h.base-h.terraceDrop,'floor');
    }
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
    const roofMax=Math.max(H.mainTop(m,h.split+h.overhang),H.lowTop(m,h.split))+h.roofThickness;
    const box=planView?[-1300,-m.porch.depth-1050,h.width+2600,h.depth+m.porch.depth+2400]:[-1400,-roofMax-600,width+2800,roofMax+h.base+1900];
    const content=planView?plan(m,view==='plan1'?1:2,selection):view==='section'?section(m):elevation(m,view,selection);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.join(' ')}" role="img" aria-label="Редактируемый чертёж дома"><style>${css}</style><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" fill="white"/>${content}</svg>`;
  }
  global.HouseDrawings={draw};
})(window);
