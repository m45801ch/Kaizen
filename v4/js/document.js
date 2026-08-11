/* 右側文件：依目前模板渲染 + 事件綁定 + 照片上傳/壓縮 */
import { state, data, saveForm, persistImages, DEFAULT_LOGO } from "./store.js";
import { getTemplate } from "./templates/index.js";
import { gaChartSvg } from "./templates/slide/index.js";
import { buildLines, escEmphasis, unEmphasis } from "./analysis.js";

const $ = id => document.getElementById(id);

export function autoResize(el){
  if(!el || el.tagName!=="TEXTAREA") return;
  el.style.height="auto";
  el.style.height = el.scrollHeight+"px";
}

export function syncFromDom(){
  const tpl = getTemplate(state.template);
  data.title = $("f-title")?$("f-title").value:"";
  data.before = $("f-before")?$("f-before").value:"";
  data.after = $("f-after")?$("f-after").value:"";
  data.benefits[0] = $("f-benefit-1") ? unEmphasis($("f-benefit-1").innerHTML) : "";
  data.benefits[1] = $("f-benefit-2") ? unEmphasis($("f-benefit-2").innerHTML) : "";
  data.benefits[2] = $("f-benefit-3") ? unEmphasis($("f-benefit-3").innerHTML) : "";
  /* 模板專用欄位 */
  data.extra = data.extra || {};
  if(tpl.id==="safety"){ data.extra = data.extra||{}; if(!data.extra.safetyLevel) data.extra.safetyLevel=""; }
  if(tpl.id==="quality"){ data.extra.qualityUnit = $("f-quality-unit")?$("f-quality-unit").value:""; data.extra.qualityStd = $("f-quality-std")?$("f-quality-std").value:""; }
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
  if(showEdit) autoResize(ta);
}
export function renderAllAnalysis(){ ["before","after"].forEach(renderAnalysis); }

/* AI 結果填入右側 */
export function fillForm(obj, force){
  if(obj && Array.isArray(obj.benefits)){
    obj = { ...obj, benefit1:obj.benefits[0], benefit2:obj.benefits[1], benefit3:obj.benefits[2] };
  }
  const map={ title:"f-title", before:"f-before", after:"f-after", benefit1:"f-benefit-1", benefit2:"f-benefit-2", benefit3:"f-benefit-3" };
  Object.keys(map).forEach(k=>{
    const v = obj[k]!==undefined&&obj[k]!==null?String(obj[k]):"";
    const el=$(map[k]);
    if(!v||!el) return;
    if(force || state.override || !(el.value||el.textContent||"").trim()){
      if(el.dataset && el.dataset.benefit) el.innerHTML = escEmphasis(v);
      else el.value = v;
    }
  });
  ["f-title","f-before","f-after","f-benefit-1","f-benefit-2","f-benefit-3"].forEach(id=>autoResize($(id)));
  if(getTemplate(state.template).id==="safety"){
    const lv=String(obj.safetyLevel||"");
    if(lv==="高"||lv==="中"||lv==="低"){ data.extra = data.extra||{}; data.extra.safetyLevel=lv; }
  }
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
  const view = { ...data, photos: state.images, slidePhotoSize: state.slidePhotoSize, slidePhotoPos: state.slidePhotoPos };
  const doc = $("doc");
  doc.innerHTML = tpl.render(view, { esc:(s)=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"), buildLines });
  /* 照片位置計算 */
  ["before","after"].forEach(side=>{ if($("photo-grid-"+side)) layoutPhotos(side); });
  /* 綁定 */
  bindDocument();
  /* LOGO */
  const el = $("logoImg");
  if(el) el.src = localStorage.getItem("kai.gen.logo.v1") || DEFAULT_LOGO;
}

function layoutPhotos(side){
  const grid = $("photo-grid-"+side);
  if(!grid) return;
  const zone = $("photo-zone-"+side);
  const zoneW = zone ? zone.clientWidth - 24 : grid.clientWidth;   // 扣除 padding 12*2
  const gap = 9;
  let x = 0, y = 0, rowH = 0, maxBottom = 64;
  state.images[side].forEach(p=>{
    const w = p.dispW || 260, h = p.dispH || Math.max(40, Math.round(260*((p.w&&p.h)?p.h/p.w:1)));
    let px, py;
    if(p.dispX!==undefined && p.dispY!==undefined){
      px = p.dispX; py = p.dispY;
    } else {
      if(x>0 && x+w>zoneW){ y += rowH+gap; x = 0; rowH = 0; }
      px = x; py = y;
      x += w+gap;
      if(h>rowH) rowH = h;
    }
    const thumb = grid.querySelector('.photo-thumb[data-resize="'+p.id+'"]');
    if(thumb){ thumb.style.left = px+"px"; thumb.style.top = py+"px"; }
    const bottom = py+h;
    if(bottom>maxBottom) maxBottom = bottom;
  });
  grid.style.height = maxBottom+"px";
  const landscape = document.body.classList.contains("orient-landscape");
  const printW = landscape
    ? Math.round(Math.round(269*96/25.4) - 316) - 20
    : Math.round((Math.round(180*96/25.4) - 11)/2) - 20;
  if(zoneW>0){
    let s = printW / zoneW;
    s = Math.min(1, Math.max(0.3, s));
    grid.style.setProperty("--ps", String(s));
    grid.style.setProperty("--ph", String(maxBottom)+"px");
  }
}

function bindDocument(){
  const doc=$("doc");

  /* 表單輸入 */
  ["f-title","f-before","f-after","f-benefit-1","f-benefit-2","f-benefit-3","f-quality-unit","f-quality-std"].forEach(id=>{
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

  /* 簡報文字直接編輯 */
  if(getTemplate(state.template).id==="slide"){
    doc.querySelectorAll("[data-slide-field]").forEach(el=>{
      el.addEventListener("input",()=>{
        const f=el.dataset.slideField;
        const s=data.slide;
        if(!s) return;
        if(f==="slideTitle") s.slideTitle=el.textContent;
        else if(f==="conclusion") s.conclusion=el.textContent;
        else {
          const m=/^([a-zA-Z]+)-(\d+)$/.exec(f);
          if(m&&m[1]==="keyPoints"&&s.keyPoints[+m[2]]!==undefined) s.keyPoints[+m[2]]=el.textContent;
          if(m&&m[1]==="benefits"&&s.benefits[+m[2]]!==undefined){
            s.benefits[+m[2]]=el.textContent;
            if(/(\d+(?:\.\d+)?)\s*%/.test(el.textContent)) redrawSlideChart();
          }
        }
        saveForm();
      });
    });
  }

  if(doc.dataset.bound) return;
  doc.dataset.bound = "1";

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
    const ct=e.target.closest("[data-center]");
    if(ct){
      const id=ct.dataset.center;
      ["before","after"].forEach(side=>{
        const p=state.images[side].find(x=>x.id===id);
        if(p){
          const zone=$("photo-zone-"+side);
          const gridEl=zone?zone.querySelector(".photo-grid"):null;
          const zoneW=zone?Math.max(40,zone.clientWidth-24):800;
          const zoneH=gridEl?Math.max(40,gridEl.clientHeight-24):(zone?Math.max(40,zone.clientHeight-24):600);
          const w=p.dispW||260, h=p.dispH||Math.max(40,Math.round(260*((p.w&&p.h)?p.h/p.w:1)));
          p.dispX=Math.max(0,Math.round((zoneW-w)/2));
          p.dispY=Math.max(0,Math.round((zoneH-h)/2));
          renderDocument();
          persistImages();
        }
      });
      return;
    }
    const lv=e.target.closest("[data-level-set]");
    if(lv){
      data.extra = data.extra||{};
      data.extra.safetyLevel=lv.dataset.levelSet;
      renderDocument();
      saveForm();
      return;
    }
    const rt=e.target.closest("[data-reset-ratio]");
    if(rt){
      const id=rt.dataset.resetRatio;
      ["before","after"].forEach(side=>{
        const p=state.images[side].find(x=>x.id===id);
        if(p){
          const ratio=(p.w&&p.h)?p.h/p.w:1;
          p.dispW=260;
          p.dispH=Math.max(40,Math.round(260*ratio));
          renderDocument();
          persistImages();
        }
      });
      return;
    }
  });

  /* 照片移動：拖照片本體 */
  doc.addEventListener("pointerdown", e=>{
    const thumb = e.target.closest(".photo-thumb");
    if(!thumb) return;
    if(e.target.closest(".resize-handle,.remove,.edit-btn,.center-btn,.ratio-btn")) return;
    const id = thumb.querySelector("[data-resize]") ? thumb.querySelector("[data-resize]").dataset.resize : null;
    if(!id) return;
    e.preventDefault();
    const zone = thumb.closest(".photo-zone");
    const gridEl = zone ? zone.querySelector(".photo-grid") : null;
    const zoneW = zone ? Math.max(40, zone.clientWidth - 24) : 800;
    const startX = e.clientX, startY = e.clientY;
    const baseX = thumb.offsetLeft, baseY = thumb.offsetTop;
    const maxX = Math.max(0, zoneW - thumb.offsetWidth);
    function onMove(ev){
      const nx = Math.max(0, Math.min(maxX, baseX + (ev.clientX - startX)));
      const ny = Math.max(0, baseY + (ev.clientY - startY));
      thumb.style.left = nx+"px";
      thumb.style.top = ny+"px";
      if(gridEl){
        const need = Math.round(ny + thumb.offsetHeight);
        if(need > gridEl.offsetHeight) gridEl.style.height = need+"px";
      }
    }
    function onUp(){
      thumb.removeEventListener("pointermove", onMove);
      thumb.removeEventListener("pointerup", onUp);
      const lx = thumb.offsetLeft, ly = thumb.offsetTop;
      ["before","after"].forEach(side=>{
        const p = state.images[side].find(x=>x.id===id);
        if(p){ p.dispX = lx; p.dispY = ly; if($("photo-grid-"+side)) layoutPhotos(side); }
      });
      persistImages();
    }
    const onCancel = ()=>{ onUp(); };
    thumb.setPointerCapture(e.pointerId);
    thumb.addEventListener("pointermove", onMove);
    thumb.addEventListener("pointerup", onUp);
    thumb.addEventListener("pointercancel", onCancel);
    thumb.addEventListener("lostpointercapture", onCancel);
  });

  /* 照片縮放把手（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    const handle = e.target.closest(".resize-handle");
    if(!handle) return;
    e.preventDefault();
    const id = handle.dataset.resize;
    const thumb = handle.closest(".photo-thumb");
    if(!thumb) return;
    const zone = thumb.closest(".photo-zone");
    const maxW = zone ? Math.max(40, zone.clientWidth - 24) : 800;
    const startX = e.clientX, startY = e.clientY;
    const startW = thumb.offsetWidth, startH = thumb.offsetHeight;
    function onMove(ev){
      const w = Math.min(maxW, Math.max(40, startW + (ev.clientX - startX)));
      const h = Math.max(40, startH + (ev.clientY - startY));
      thumb.style.width = w+"px";
      thumb.style.height = h+"px";
    }
    function onUp(){
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      const w = thumb.offsetWidth, h = thumb.offsetHeight;
      ["before","after"].forEach(side=>{
        const p = state.images[side].find(x=>x.id===id);
        if(p){ p.dispW = w; p.dispH = h; if($("photo-grid-"+side)) layoutPhotos(side); }
      });
      persistImages();
    }
    handle.setPointerCapture(e.pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  });

  /* 簡報照片縮放把手（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const handle = e.target.closest("[data-slide-resize]");
    if(!handle) return;
    e.preventDefault();
    const id = handle.dataset.slideResize;
    const frame = handle.closest(".slide-photo-frame");
    if(!frame) return;
    const zone = frame.closest(".slide-photos");
    const maxW = zone ? Math.max(40, zone.clientWidth - 24) : 800;
    const maxH = zone ? Math.max(40, zone.clientHeight - 24) : 600;
    const startX = e.clientX, startY = e.clientY;
    const startW = frame.offsetWidth, startH = frame.offsetHeight;
    function onMove(ev){
      const w = Math.min(maxW, Math.max(40, startW + (ev.clientX - startX)));
      const h = Math.min(maxH, Math.max(40, startH + (ev.clientY - startY)));
      frame.style.width = w+"px";
      frame.style.height = h+"px";
    }
    function onUp(){
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      state.slidePhotoSize[id] = { w: frame.offsetWidth, h: frame.offsetHeight };
    }
    handle.setPointerCapture(e.pointerId);
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
  });

  /* 簡報照片拖拽移動（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    if(getTemplate(state.template).id!=="slide") return;
    const target = e.target.closest("[data-slide-pos]");
    if(!target) return;
    if(e.target.closest("[data-slide-resize]")) return;
    e.preventDefault();
    const id = target.dataset.slidePos;
    const zone = target.closest(".slide-photos");
    const maxX = zone ? Math.max(0, zone.clientWidth - target.offsetWidth) : 800;
    const maxY = zone ? Math.max(0, zone.clientHeight - target.offsetHeight) : 600;
    const startX = e.clientX, startY = e.clientY;
    const baseX = target.offsetLeft, baseY = target.offsetTop;
    function onMove(ev){
      const nx = Math.max(0, Math.min(maxX, baseX + (ev.clientX - startX)));
      const ny = Math.max(0, Math.min(maxY, baseY + (ev.clientY - startY)));
      target.style.left = nx+"px";
      target.style.top = ny+"px";
    }
    function onUp(){
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onCancel);
      target.removeEventListener("lostpointercapture", onCancel);
      state.slidePhotoPos[id] = { x: target.offsetLeft, y: target.offsetTop };
    }
    const onCancel = ()=>{ onUp(); };
    target.setPointerCapture(e.pointerId);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onCancel);
  });
}

function redrawSlideChart(){
  const box=document.querySelector("#doc .slide-benefits");
  if(!box||!data.slide||!Array.isArray(data.slide.benefits)||!data.slide.benefits.length) return;
  const chartType=data.slide.chartType==="pie" ? "pie" : "bar";
  const svgEl=box.querySelector(".sc-svg");
  if(svgEl) svgEl.outerHTML='<svg viewBox="0 0 280 150" class="sc-svg">'+gaChartSvg(data.slide.benefits, chartType).replace(/^[\s\S]*?<svg[^>]*>|<\/svg>[\s\S]*$/g,"")+"</svg>";
}
