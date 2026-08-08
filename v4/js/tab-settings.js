/* 通用設定頁籤：API 供應商/Key/模型、圖片壓縮、A4 直橫向、LOGO */
import { state, STORE } from "./store.js";
import { MODELS, HINTS, KEY_PLACEHOLDERS, fetchModels } from "./ai.js";

const $ = id => document.getElementById(id);

export function initSettings(){
  const providerSelect=$("providerSelect"), apiKey=$("apiKey"), toggleKey=$("toggleKey"),
        keyHint=$("keyHint"), model=$("model"), modelHint=$("modelHint"), refreshBtn=$("refreshModelsBtn");

  function renderModels(provider){
    const list = state.catalog[provider] || MODELS[provider] || [];
    model.innerHTML="";
    const current=state.models[provider];
    let found=false;
    list.forEach(m=>{
      const o=document.createElement("option"); o.value=m.id; o.textContent=m.label;
      if(m.id===current){ o.selected=true; found=true; }
      model.appendChild(o);
    });
    if(!found&&list.length){ model.selectedIndex=0; state.models[provider]=list[0].id; localStorage.setItem(STORE.model+":"+provider,list[0].id); }
  }

  async function refreshModels(){
    const provider=state.provider, key=apiKey.value.trim();
    if(!key){ modelHint.textContent="請先輸入 API Key 再載入模型清單"; return; }
    modelHint.textContent="載入模型清單中…";
    try{
      const list=await fetchModels(provider,key);
      state.catalog[provider]=list;
      renderModels(provider);
      modelHint.textContent="已載入 "+list.length+" 個可用模型（輸入後會自動更新）";
    }catch(err){
      modelHint.textContent="模型清單載入失敗，目前為預設清單";
      window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"error",html:"模型清單載入失敗："+err.message}}));
      setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),6000);
    }
  }

  function renderProvider(){
    providerSelect.value=state.provider;
    renderModels(state.provider);
    apiKey.value=state.keys[state.provider]||"";
    apiKey.placeholder=KEY_PLACEHOLDERS[state.provider];
    keyHint.innerHTML=HINTS[state.provider];
    modelHint.textContent="輸入 API Key 後自動載入全部可用模型";
  }

  providerSelect.addEventListener("change",()=>{
    const next=providerSelect.value;
    if(next===state.provider) return;
    state.provider=next;
    localStorage.setItem(STORE.provider,next);
    renderProvider();
    if(state.keys[next]) refreshModels();
  });

  let refreshTimer;
  apiKey.addEventListener("input",()=>{
    state.keys[state.provider]=apiKey.value;
    localStorage.setItem(STORE.key+":"+state.provider,apiKey.value);
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(refreshModels,800);
  });

  refreshBtn.addEventListener("click",refreshModels);
  toggleKey.addEventListener("click",()=>{
    const show=apiKey.type==="password";
    apiKey.type=show?"text":"password";
    toggleKey.textContent=show?"隱藏":"顯示";
  });
  model.addEventListener("change",()=>{
    state.models[state.provider]=model.value;
    localStorage.setItem(STORE.model+":"+state.provider,model.value);
  });

  /* 圖片壓縮 */
  $("compressToggle").checked=state.compress;
  $("compressSlider").value=state.compressMax;
  $("compressVal").textContent=state.compressMax;
  $("compressToggle").addEventListener("change",function(){
    state.compress=this.checked;
    localStorage.setItem(STORE.compress,state.compress?"1":"0");
  });
  $("compressSlider").addEventListener("input",function(){
    state.compressMax=parseInt(this.value,10)||1600;
    $("compressVal").textContent=state.compressMax;
    localStorage.setItem(STORE.compressMax,String(state.compressMax));
  });

  renderProvider();
  if(state.keys[state.provider]) setTimeout(refreshModels,300);
}
