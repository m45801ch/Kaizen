/* 啟動與組裝 */
import { state, STORE, data, saveForm, loadForm, loadImages } from "./store.js";
import { initSidebar } from "./sidebar.js";
import { initSettings } from "./tab-settings.js";
import { initNarrative } from "./tab-narrative.js";
import { renderDocument, renderAllAnalysis, autoResize, syncFromDom } from "./document.js";
import { initEditor } from "./editor/editor.js";
import { listTemplates, getTemplate } from "./templates/index.js";

const $ = id => document.getElementById(id);

window.addEventListener("kaizen:status",e=>{
  const s=$("status");
  s.className="status show";
  const {kind,html}=e.detail;
  if(kind==="loading") s.innerHTML='<div class="status-loading"><span class="spinner"></span>'+html+"</div>";
  else if(kind==="success") s.innerHTML='<div class="status-success">'+html+"</div>";
  else s.innerHTML='<div class="status-error">'+html+"</div>";
});
window.addEventListener("kaizen:status-hide",()=>{ const s=$("status"); if(s){ s.className="status"; s.innerHTML=""; } });

function applyTemplateClass(){
  document.body.classList.toggle("tpl-safety", state.template==="safety");
}

function renderTemplateGrid(){
  const grid=$("templateGrid");
  if(!grid) return;
  grid.innerHTML="";
  listTemplates().forEach(t=>{
    const card=document.createElement("button");
    card.type="button";
    card.className="tpl-card"+(t.id===state.template?" selected":"");
    card.dataset.tpl=t.id;
    card.innerHTML='<div class="tpl-name">'+t.name+'</div><div class="tpl-desc">'+t.desc+'</div>'+
      (t.id===state.template?'<span class="tpl-tag">現用</span>':'');
    card.addEventListener("click",()=>{
      state.template=t.id;
      localStorage.setItem(STORE.template,t.id);
      renderTemplateGrid();
      applyTemplateClass();
      renderDocument();
      if(t.id==="slide"&&window.__applyOrientation) window.__applyOrientation("landscape", true);
    });
    grid.appendChild(card);
  });
}

function init(){
  initSidebar();
  initSettings();
  initNarrative();
  initEditor();
  loadForm();
  applyTemplateClass();
  renderDocument();
  renderTemplateGrid();
  loadImages(()=>renderDocument());

  window.__renderTemplateGrid = renderTemplateGrid;
  window.addEventListener("kaizen:photos-changed",()=>{ applyTemplateClass(); renderDocument(); });

  /* A4 直橫向 */
  const orientSel = $("orientSel");
  let orientStyleEl = null;
  function applyOrientation(orient, persist){
    document.body.classList.toggle("orient-landscape", orient === "landscape");
    if(orient === "landscape"){
      if(!orientStyleEl){
        orientStyleEl = document.createElement("style");
        orientStyleEl.id = "orientStyle";
        orientStyleEl.textContent = "@page{size:A4 landscape;margin:0}";
        document.head.appendChild(orientStyleEl);
      }
    } else if(orientStyleEl){
      orientStyleEl.remove();
      orientStyleEl = null;
    }
    if(persist) localStorage.setItem(STORE.orient, orient);
  }
  window.__applyOrientation = applyOrientation;
  if(orientSel){
    orientSel.value = localStorage.getItem(STORE.orient) === "landscape" ? "landscape" : "portrait";
    applyOrientation(orientSel.value, false);
    orientSel.addEventListener("change", ()=> applyOrientation(orientSel.value, true));
  }
  $("printBtn").addEventListener("click",()=>{
    document.title=($("f-title")&&$("f-title").value.trim())||"改善提案表";
    const slide=$(".doc .slide-page");
    if(slide){
      const landscape=document.body.classList.contains("orient-landscape");
      const printW = landscape
        ? Math.round(297*96/25.4)
        : Math.round(210*96/25.4);
      const printH = landscape
        ? Math.round(210*96/25.4)
        : Math.round(297*96/25.4);
      const rect=slide.getBoundingClientRect();
      if(rect.width>0){
        const designW=slide.clientWidth, designH=slide.clientHeight;
        if(designW>0&&designH>0){
          slide.style.setProperty("--slide-w", designW+"px");
          slide.style.setProperty("--slide-h", designH+"px");
          const scale=Math.min(1, printW/designW, printH/designH);
          slide.style.setProperty("--slide-ps", String(scale));
        }
      }
    }
    window.print();
  });
  $("resetBtn").addEventListener("click",()=>{
    if(!confirm("確定要清空所有欄位與照片嗎？")) return;
    $("f-title").value=""; $("f-before").value=""; $("f-after").value="";
    $("f-benefit-1").innerHTML=""; $("f-benefit-2").innerHTML=""; $("f-benefit-3").innerHTML="";
    $("conv-before").value=""; $("conv-after").value="";
    state.images.before=[]; state.images.after=[];
    state.editSide.before="right"; state.editSide.after="right";
    data.title=""; data.before=""; data.after=""; data.benefits=["","",""]; data.extra={};
    saveForm();
    renderDocument();
    window.dispatchEvent(new CustomEvent("kaizen:status-hide"));
  });
}

window.addEventListener("DOMContentLoaded",init);
