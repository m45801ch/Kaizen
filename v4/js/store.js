/* 集中狀態與持久化：documentData + settings（localStorage / IndexedDB） */
export { DEFAULT_LOGO } from "./logo-data.js";

export const STORE = {
  provider:"kai.gen.provider.v1", key:"kai.gen.key.v1", model:"kai.gen.model.v1",
  form:"kai.gen.form.v1", override:"kai.gen.override.v1", orient:"kai.gen.orient.v1",
  imgsize:"kai.gen.imgsize.v1", dtitle:"kai.gen.dtitle.v1", logo:"kai.gen.logo.v1",
  compress:"kai.gen.compress.v1", compressMax:"kai.gen.compressMax.v1",
  template:"kai.gen.template.v1"
};

export const state = {
  provider: localStorage.getItem(STORE.provider) || "gemini",
  keys: {},
  models: {},
  catalog: {},
  override: localStorage.getItem(STORE.override) === "1",
  template: localStorage.getItem(STORE.template) || "generic",
  editSide: { before:"right", after:"right" },
  compress: localStorage.getItem(STORE.compress) !== "0",
  compressMax: parseInt(localStorage.getItem(STORE.compressMax) || "1600",10) || 1600,
  images: { before:[], after:[] },
  slidePhotoSize: {},
  slidePhotoPos: {},
  slideZ: {},
  slideBlockPos: {},
  slideBlockZ: {}
};
state.keys.gemini = localStorage.getItem(STORE.key+":gemini") || "";
state.keys.openai = localStorage.getItem(STORE.key+":openai") || "";
state.keys.openrouter = localStorage.getItem(STORE.key+":openrouter") || "";
state.keys.groq = localStorage.getItem(STORE.key+":groq") || "";
state.models.gemini = localStorage.getItem(STORE.model+":gemini") || "gemini-3.5-flash-lite";
state.models.openai = localStorage.getItem(STORE.model+":openai") || "gpt-4o-mini";
state.models.openrouter = localStorage.getItem(STORE.model+":openrouter") || "openai/gpt-4o-mini";
state.models.groq = localStorage.getItem(STORE.model+":groq") || "llama-3.3-70b-versatile";

export const data = {
  title:"", docTitle:"改善提案表", before:"", after:"", benefits:["","",""],
  extra:{}, slide:null
};

const DB_NAME="kai_gen", DB_STORE="images";

export function saveForm(){
  const obj = { title:data.title, docTitle:data.docTitle, before:data.before, after:data.after, benefits:data.benefits, extra:data.extra, slide:data.slide };
  localStorage.setItem(STORE.form, JSON.stringify(obj));
}
export function loadForm(){
  try{
    const saved = JSON.parse(localStorage.getItem(STORE.form) || "{}");
    if (saved.title !== undefined) data.title = saved.title;
    if (saved.docTitle !== undefined) data.docTitle = saved.docTitle;
    if (saved.before !== undefined) data.before = saved.before;
    if (saved.after !== undefined) data.after = saved.after;
    if (Array.isArray(saved.benefits)) data.benefits = saved.benefits;
    if (saved.extra) data.extra = saved.extra;
    if (saved.slide) data.slide = saved.slide;
  }catch(e){}
}

function idbOpen(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME,1);
    req.onupgradeneeded = ()=>{ if(!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE,{keyPath:"id"}); };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
export function persistImages(){
  const all = state.images.before.concat(state.images.after);
  idbOpen().then(db=>new Promise((res,rej)=>{
    const tx=db.transaction(DB_STORE,"readwrite"), store=tx.objectStore(DB_STORE);
    store.clear(); all.forEach(p=>store.put(p));
    tx.oncomplete=res; tx.onerror=()=>rej(tx.error);
  })).catch(e=>console.warn("照片儲存失敗",e));
}
export function loadImages(cb){
  idbOpen().then(db=>new Promise((res,rej)=>{
    const req=db.transaction(DB_STORE,"readonly").objectStore(DB_STORE).getAll();
    req.onsuccess=()=>res(req.result||[]); req.onerror=()=>rej(req.error);
  })).then(all=>{
    all.forEach(p=>{ if((p.side==="before"||p.side==="after")&&state.images[p.side].length<10) state.images[p.side].push(p); });
    cb && cb();
  }).catch(e=>console.warn("照片載入失敗",e));
}
