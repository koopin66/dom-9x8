(function(){
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
  const houseLabels={width:'Ширина дома, мм',depth:'Глубина дома, мм',split:'Двухэтажная часть, мм',kitchenDepth:'Глубина кухни, мм',ceiling:'Потолок 1 этажа, мм',slab:'Перекрытие, мм',atticLow:'Низ аттика, мм',atticHigh:'Верх аттика, мм',kitchenEave:'Низ крыши кухни, мм',kitchenRise:'Подъём крыши кухни, мм',roofThickness:'Толщина кровли, мм',overhang:'Свес кровли, мм',base:'Высота цоколя, мм',terraceDrop:'Перепад основания террасы, мм',facadeProjection:'Выступ фасада наружу, мм'};
  function objectList(){
    const opts=[['house:house','Дом и крыша'],['stair:stair','Лестница'],['porch:porch','Крыльцо']];
    const groups=[['Общие размеры',opts],['Стены',model.walls.map(w=>['wall:'+w.id,w.name])],['Окна и двери',model.openings.map(o=>['opening:'+o.id,`${o.name} · ${o.floor} эт.`])]];
    $('object').innerHTML=groups.map(([label,options])=>`<optgroup label="${label}">${options.map(([value,name])=>`<option value="${esc(value)}">${esc(name)}</option>`).join('')}</optgroup>`).join('');
    $('object').value=selection.type+':'+selection.id;
  }
  function inspect(){
    clearTimeout(timer);objectList();let html='';
    if(selection.type==='house'){
      const h=model.house;
      html='<p>Ширина и глубина пропорционально масштабируют план, толщины стен и проёмы. Высоты задаются отдельно. Размер части дома перемещает границу между объёмами.</p><div class="fields">';
      for(const key of ['width','depth','split','kitchenDepth'])html+=numberField(key,houseLabels[key],h[key],{min:H.limits[key][0],max:H.limits[key][1]});
      html+='</div><details><summary>Высоты, кровля и основание</summary><div class="fields">';
      for(const key of Object.keys(houseLabels).slice(4))html+=numberField(key,houseLabels[key],h[key],{min:H.limits[key][0],max:H.limits[key][1]});
      html+='</div></details>';
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
      const p=model.porch;html='<div class="fields">'+numberField('x','Начало X, мм',p.x)+numberField('width','Ширина, мм',p.width,{min:600})+numberField('depth','Глубина, мм',p.depth,{min:300,max:3000})+'</div>';
    }
    $('properties').innerHTML=html;
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
  $('properties').addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(applyFields,450);});
  $('properties').addEventListener('change',()=>{clearTimeout(timer);applyFields();});
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
  try{view3d=createHouseView($('model'),select);}catch(e){$('model-message').textContent='3D недоступно в этом браузере. '+e.message;$('model-message').hidden=false;}
  inspect();render();updateButtons();
  // Read-only snapshot for diagnostics and acceptance checks.
  window.houseEditor={snapshot:()=>H.clone(model),getSelection:()=>({...selection})};
})();
