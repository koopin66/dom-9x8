// One content-addressed script prevents cached drawing/model versions mixing.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=__dirname;
const sources=['editor-model.js','editor-drawings.js','editor-3d.js','editor.js'];
const bundle=sources.map(name=>'/* '+name+' */\n'+fs.readFileSync(path.join(root,name),'utf8')).join('\n;\n');
const hash=crypto.createHash('sha256').update(bundle).digest('hex').slice(0,16);
const asset='assets/house-editor.'+hash+'.js';
const checking=process.argv.includes('--check');
const scriptPattern=/<script src="(?:editor-(?:model|drawings|3d)|editor)\.js[^"\r\n]*"><\/script>/g;
const bundlePattern=/<script src="assets\/house-editor\.[a-f0-9]+\.js"><\/script>/g;
if(!checking){
  fs.mkdirSync(path.join(root,'assets'),{recursive:true});
  fs.writeFileSync(path.join(root,asset),bundle);
}
for(const name of ['index.html','dom-9x8.html']){
  const file=path.join(root,name),html=fs.readFileSync(file,'utf8');
  let inserted=false;
  const replace=()=>{if(inserted)return '';inserted=true;return '<script src="'+asset+'"></script>';};
  const next=html.replace(scriptPattern,replace).replace(bundlePattern,()=>'<script src="'+asset+'"></script>');
  if(checking){
    if(next!==html||html.match(bundlePattern)?.length!==1||!fs.existsSync(path.join(root,asset))||fs.readFileSync(path.join(root,asset),'utf8')!==bundle)
      throw new Error('Run node prepare-assets.cjs before publishing.');
  }else fs.writeFileSync(file,next);
}
if(!checking){
  for(const name of fs.readdirSync(path.join(root,'assets')))
    if(/^house-editor\.[a-f0-9]+\.js$/.test(name)&&'assets/'+name!==asset)fs.unlinkSync(path.join(root,'assets',name));
}
console.log((checking?'Verified ':'Prepared ')+asset);
