/* 敘述頁籤：改善前後輸入、AI 一鍵生成、正式措辭、照片視覺分析 */
import { state, data, STORE, saveForm } from "./store.js";
import { getModel, getKey, callForProvider } from "./ai.js";
import { buildPrompt, buildColloquialPrompt, buildVisionPrompt, buildSlidePrompt } from "./prompts.js";
import { renderAnalysis, renderAllAnalysis, fillForm, syncFromDom, autoResize, renderDocument } from "./document.js";

const $ = id => document.getElementById(id);
const CONV_IDS=["conv-before","conv-after"];

function status(kind,html){
  window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind,html}}));
}

function sources(){
  return { srcBefore: $("conv-before").value.trim(), srcAfter: $("conv-after").value.trim() };
}

export async function generateAll(){
  const key=getKey();
  if(!key){ status("error","請先在「通用設定」輸入 API Key。"); return; }
  const { srcBefore, srcAfter } = sources();
  if(!srcBefore && !srcAfter){ status("error","請先於左側「正式措辭描述」欄位輸入改善前或改善後的內容。"); return; }
  const d={ title:data.title, before:srcBefore, after:srcAfter, benefits:data.benefits };
  const model=getModel();
  const btn=$("generateBtn");
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> 生成中…';
  status("loading","正在同步產生正式表格與正式措辭，請稍候…");
  try{
    const results=await Promise.all([
      callForProvider(state.provider,key,model,buildPrompt(d)),
      callForProvider(state.provider,key,model,buildColloquialPrompt(srcBefore,srcAfter))
    ]);
    fillForm(results[0], true);
    if(results[1].before_conv!==undefined) $("conv-before").value=String(results[1].before_conv);
    if(results[1].after_conv!==undefined) $("conv-after").value=String(results[1].after_conv);
    CONV_IDS.forEach(id=>autoResize($(id)));
    renderDocument();
    renderAllAnalysis();
    status("success","已同步完成自動填表與正式措辭。");
    setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),5000);
  }catch(err){
    status("error","生成失敗：<br>"+err.message);
  }finally{
    btn.disabled=false;
    btn.textContent="點我 · 自動填寫＋正式措辭";
  }
}

export async function analyzePhotos(){
  const key=getKey();
  if(!key){ status("error","請先在「通用設定」輸入 API Key。"); return; }
  const side="before";
  const photos=state.images[side];
  if(!photos.length){ status("error","請先在右側上傳改善前照片。"); return; }
  const model=getModel();
  const btn=$("visionBtn");
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> 分析中…';
  status("loading","正在以照片進行視覺分析…");
  try{
    const images=photos.map(p=>({ mime:p.mime||"image/jpeg", data:p.dataUrl.split(",")[1] }));
    const obj=await callForProvider(state.provider,key,model,buildVisionPrompt(),images);
    if(obj.before) $("f-before").value=obj.before;
    if(obj.after) $("f-after").value=obj.after;
    renderAllAnalysis();
    syncFromDom();
    status("success","照片分析完成，已填入改善前／後。");
    setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),5000);
  }catch(err){
    status("error","分析失敗："+err.message+"（若不支援視覺，請改用 Gemini 2.5 Flash 或 GPT-4o 等視覺模型）");
  }finally{
    btn.disabled=false;
    btn.textContent="AI 分析照片";
  }
}

export async function generateSlide(){
  const key=getKey();
  if(!key){ status("error","請先在「通用設定」輸入 API Key。"); return; }
  syncFromDom();
  const d={ title:data.title, before:data.before, after:data.after, benefits:data.benefits };
  const model=getModel();
  const btn=$("slideBtn");
  btn.disabled=true;
  btn.innerHTML='<span class="spinner"></span> 生成中…';
  status("loading","正在生成一頁簡報…");
  try{
    const obj=await callForProvider(state.provider,key,model,buildSlidePrompt(d));
    data.slide={ slideTitle:obj.slideTitle||d.title||"改善提案", keyPoints:Array.isArray(obj.keyPoints)?obj.keyPoints:[], benefits:Array.isArray(obj.benefits)?obj.benefits:[], conclusion:obj.conclusion||"" };
    saveForm();
    state.template="slide";
    localStorage.setItem(STORE.template,"slide");
    renderDocument();
    if(window.__renderTemplateGrid) window.__renderTemplateGrid();
    status("success","簡報已生成並切換到簡報模板，可列印／匯出 PDF。");
    setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),5000);
  }catch(err){
    status("error","簡報生成失敗："+err.message);
  }finally{
    btn.disabled=false;
    btn.textContent="生成一頁簡報";
  }
}

export function initNarrative(){
  $("generateBtn").addEventListener("click",generateAll);
  $("visionBtn").addEventListener("click",analyzePhotos);
  $("slideBtn").addEventListener("click",generateSlide);

  const FORM=["f-title","f-before","f-after","f-benefit-1","f-benefit-2","f-benefit-3"];
  FORM.forEach(id=>{
    $(id).addEventListener("input",()=>{
      if(id==="f-before") state.editSide.before="right";
      if(id==="f-after") state.editSide.after="right";
      syncFromDom();
      autoResize($(id));
      if(id==="f-before"||id==="f-after") renderAnalysis(id.replace("f-",""));
    });
    autoResize($(id));
  });
  CONV_IDS.forEach(id=>{
    $(id).addEventListener("input",()=>{
      if(id==="conv-before") state.editSide.before="left";
      if(id==="conv-after") state.editSide.after="left";
      autoResize($(id));
    });
    autoResize($(id));
  });

  /* 分析預覽：點擊切回編輯、失焦還原 */
  [["analysis-preview-before","f-before"],["analysis-preview-after","f-after"]].forEach(([pv,id])=>{
    $(pv).addEventListener("click",()=>{
      state.editSide[id.replace("f-","")]="editing";
      renderAnalysis(id.replace("f-",""));
      autoResize($(id));
      $(id).focus();
    });
    $(id).addEventListener("blur",()=>{
      state.editSide[id.replace("f-","")]="right";
      renderAnalysis(id.replace("f-",""));
    });
  });

  /* 複製／清除 */
  document.querySelectorAll(".copy-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const ta=$(btn.dataset.copy), text=ta.value.trim();
      if(!text) return;
      const done=()=>{ btn.textContent="已複製"; setTimeout(()=>{btn.textContent="複製";},1500); };
      if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(()=>{ fallbackCopy(text); done(); });
      else { fallbackCopy(text); done(); }
    });
  });
  document.querySelectorAll(".clear-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const side=btn.dataset.clear;
      if(!confirm("確定要清除「改善"+(side==="before"?"前":"後")+"」的內容（含右側對應欄位）嗎？")) return;
      $("conv-"+side).value="";
      $("f-"+side).value="";
      state.editSide[side]="right";
      autoResize($("conv-"+side)); autoResize($("f-"+side));
      renderAnalysis(side);
      syncFromDom();
      window.dispatchEvent(new CustomEvent("kaizen:status-hide"));
    });
  });
}

function fallbackCopy(text){
  const ta=document.createElement("textarea");
  ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand("copy"); }catch(e){}
  document.body.removeChild(ta);
}
