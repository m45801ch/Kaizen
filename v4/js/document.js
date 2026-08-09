/* 右側文件：依目前模板渲染 + 事件綁定 + 照片上傳/壓縮 */
import { state, data, saveForm, persistImages, DEFAULT_LOGO } from "./store.js";
import { getTemplate } from "./templates/index.js";
import { buildLines } from "./analysis.js";

const $ = id => document.getElementById(id);

export function autoResize(el){
  if(!el || el.tagName!=="TEXTAREA") return;
  el.style.height="auto";
  el.style.height = el.scrollHeight+"px";
}

export function syncFromDom(){
  const tpl = getTemplate(state.template);
  data.title = $("#f-title")?$("#f-title").value:"";
  data.before = $("#f-before")?$("#f-before").value:"";
  data.after = $("#f-after")?$("#f-after").value:"";
  data.benefits[0] = $("#f-benefit-1")?$("#f-benefit-1").value:"";
  data.benefits[1] = $("#f-benefit-2")?$("#f-benefit-2").value:"";
  data.benefits[2] = $("#f-benefit-3")?$("#f-benefit-3").value:"";
  /* 模板專用欄位 */
  data.extra = data.extra || {};
  if(tpl.id==="safety") data.extra.safetyLevel = $("#f-safety-level")?$("#f-safety-level").value:"";
  if(tpl.id==="quality"){ data.extra.qualityUnit = $("#f-quality-unit")?$("#f-quality-unit").value:""; data.extra.qualityStd = $("#f-quality-std")?$("#f-quality-std").value:""; }
  saveForm();
}

/* 分析列點預覽 */
export function renderAnalysis(side){
  const ta=$("f-"+side), prev=$("analysis-preview-"+side);
  if(!ta||!prev) return;
  const text=(ta.value||"").trim();
  prev.innerHTML = text?buildLines(text):"";
  const editing = state.editSide[side]==="editing";
  const showEdit = editing || !text;
  prev.style.display = showEdit?"none":"block";
  ta.style.display = showEdit?"block":"none";
}
export function renderAllAnalysis(){ ["before","after"].forEach(renderAnalysis); }

/* AI 結果填入右側 */
export function fillForm(obj){
  const map={ title:"f-title", before:"f-before", after:"f-after", benefit1:"f-benefit-1", benefit2:"f-benefit-2", benefit3:"f-benefit-3" };
  Object.keys(map).forEach(k=>{
    const v = obj[k]!==undefined&&obj[k]!==null?String(obj[k]):"";
    const el=$(map[k]);
    if(!v||!el) return;
    if(state.override || !el.value.trim()) el.value=v;
  });
  ["f-title","f-before","f-after","f-benefit-1","f-benefit-2","f-benefit-3"].forEach(id=>autoResize($(id)));
  renderAllAnalysis();
  syncFromDom();
}

/* ---- 圖片壓縮 ---- */
const COMPRESS_QUALITY=0.85;
export function compressImage(file,maxDim,cb){
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      let w=img.width,h=img.height;
      const scale=Math.min(1,maxDim/Math.max(w,h));
      if(scale<1){ w=Math.max(1,Math.round(w*scale)); h=Math.max(1,Math.round(h*scale)); }
      const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext("2d");
      ctx.fillStyle="#fff"; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      cb(canvas.toDataURL("image/jpeg",COMPRESS_QUALITY),w,h);
    };
    img.onerror=()=>cb(e.target.result,0,0);
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

let uid=0;
const IMG_MAX=15*1024*1024, IMG_MAX_COUNT=10;

function addFiles(side, fileList){
  const room=IMG_MAX_COUNT-state.images[side].length;
  if(room<=0){ window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"error",html:"每邊最多可上傳 "+IMG_MAX_COUNT+" 張照片。"}})); return; }
  Array.prototype.slice.call(fileList).slice(0,room).forEach(f=>{
    if(f.type.indexOf("image/")!==0){ window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"error",html:"「"+f.name+"」不是圖片檔，已略過。"}})); return; }
    if(f.size>IMG_MAX){ window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"error",html:"「"+f.name+"」超過 15MB，已略過。"}})); return; }
    const done=(dataUrl,mime,w,h)=>{
      state.images[side].push({ id:"p"+(uid++)+Date.now().toString(36), name:f.name, dataUrl, mime, side, w, h, overlay:null });
      renderDocument();
      persistImages();
    };
    if(state.compress) compressImage(f,state.compressMax,(d,w,h)=>done(d,"image/jpeg",w,h));
    else { const r=new FileReader(); r.onload=e=>done(e.target.result,f.type,0,0); r.readAsDataURL(f); }
  });
}

/* 照片顯示：狀態訊息輔助 */
function status(kind,html){ window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind,html}})); }

/* ---- 文件渲染 + 綁定 ---- */
export function renderDocument(){
  const tpl = getTemplate(state.template);
  const view = { ...data, photos: state.images };
  const doc = $("doc");
  doc.innerHTML = tpl.render(view, { esc:(s)=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"), buildLines });
  /* 綁定 */
  bindDocument();
  /* LOGO */
  const logo = localStorage.getItem("kai.gen.logo.v1") || DEFAULT_LOGO;
  if(logo) $("logoImg").src = logo;
}

function bindDocument(){
  const doc=$("doc");

  /* 表單輸入 */
  ["f-title","f-before","f-after","f-benefit-1","f-benefit-2","f-benefit-3","f-safety-level","f-quality-unit","f-quality-std"].forEach(id=>{
    const el=$(id);
    if(!el) return;
    el.addEventListener("input",()=>{
      if(id==="f-before") state.editSide.before="right";
      if(id==="f-after") state.editSide.after="right";
      syncFromDom();
      autoResize(el);
      if(id==="f-before"||id==="f-after") renderAnalysis(id.replace("f-",""));
    });
    autoResize(el);
  });

  /* 分析預覽點擊/失焦 */
  ["before","after"].forEach(side=>{
    const pv=$("analysis-preview-"+side), ta=$("f-"+side);
    if(!pv||!ta) return;
    pv.addEventListener("click",()=>{ state.editSide[side]="editing"; renderAnalysis(side); autoResize(ta); ta.focus(); });
    ta.addEventListener("blur",()=>{ state.editSide[side]="right"; renderAnalysis(side); });
  });

  /* 文件標題可編輯 */
  const dt=$("docTitle");
  if(dt){
    dt.addEventListener("blur",()=>{ data.docTitle = dt.textContent.trim()||"改善提案表"; saveForm(); });
    dt.addEventListener("input",()=>{ data.docTitle = dt.textContent; saveForm(); });
  }

  /* 照片區：加入/拖曳 */
  ["before","after"].forEach(side=>{
    const zone=$("photo-zone-"+side), add=$("photo-add-"+side), input=$("photo-input-"+side);
    if(!zone) return;
    add.addEventListener("click",()=>input.click());
    input.addEventListener("change",()=>{ if(input.files&&input.files.length) addFiles(side,input.files); input.value=""; });
    ["dragenter","dragover"].forEach(ev=>zone.addEventListener(ev,e=>{ e.preventDefault(); e.stopPropagation(); zone.classList.add("dragover"); }));
    ["dragleave","drop"].forEach(ev=>zone.addEventListener(ev,e=>{ e.preventDefault(); e.stopPropagation(); zone.classList.remove("dragover"); }));
    zone.addEventListener("drop",e=>{ if(e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files.length) addFiles(side,e.dataTransfer.files); });
  });

  /* 照片縮圖：移除/編輯（事件委派） */
  doc.addEventListener("click",e=>{
    const rm=e.target.closest("[data-remove]");
    if(rm){
      const id=rm.dataset.remove;
      ["before","after"].forEach(side=>{
        const idx=state.images[side].findIndex(p=>p.id===id);
        if(idx!==-1){ state.images[side].splice(idx,1); renderDocument(); persistImages(); }
      });
      return;
    }
    const ed=e.target.closest("[data-edit]");
    if(ed){
      const id=ed.dataset.edit;
      ["before","after"].forEach(side=>{
        const p=state.images[side].find(x=>x.id===id);
        if(p) window.dispatchEvent(new CustomEvent("kaizen:edit-photo",{detail:{side,id}}));
      });
    }
  });
}
