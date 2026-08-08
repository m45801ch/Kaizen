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
      renderDocument();
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
  renderDocument();
  renderTemplateGrid();
  loadImages(()=>renderDocument());

  window.__renderTemplateGrid = renderTemplateGrid;
  window.addEventListener("kaizen:photos-changed",()=>renderDocument());

  $("printBtn").addEventListener("click",()=>{
    document.title=($("f-title")&&$("f-title").value.trim())||"改善提案表";
    window.print();
  });
  $("resetBtn").addEventListener("click",()=>{
    if(!confirm("確定要清空所有欄位與照片嗎？")) return;
    $("f-title").value=""; $("f-before").value=""; $("f-after").value="";
    $("f-benefit-1").value=""; $("f-benefit-2").value=""; $("f-benefit-3").value="";
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
