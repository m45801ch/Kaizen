/* AI 供應商抽象：Gemini / OpenAI / OpenRouter / Groq + 模型清單 */
import { state, STORE } from "./store.js";

export const MODELS = {
  gemini:[
    { id:"gemini-3.5-flash-lite", label:"Gemini 3.5 Flash Lite（預設）" },
    { id:"gemini-2.5-flash-lite", label:"Gemini 2.5 Flash Lite" },
    { id:"gemini-2.5-flash", label:"Gemini 2.5 Flash（平衡）" },
    { id:"gemini-2.5-pro", label:"Gemini 2.5 Pro（最強、較慢）" }
  ],
  openai:[
    { id:"gpt-4o", label:"GPT-4o（最強）" },
    { id:"gpt-4o-mini", label:"GPT-4o mini（經濟快速）" },
    { id:"gpt-4.1", label:"GPT-4.1" },
    { id:"gpt-4.1-mini", label:"GPT-4.1 mini" }
  ],
  openrouter:[
    { id:"openai/gpt-4o-mini", label:"OpenRouter · GPT-4o mini（經濟）" },
    { id:"google/gemini-2.5-flash-lite", label:"OpenRouter · Gemini 2.5 Flash Lite" },
    { id:"anthropic/claude-3.5-sonnet", label:"OpenRouter · Claude 3.5 Sonnet" },
    { id:"meta-llama/llama-3.3-70b-instruct", label:"OpenRouter · Llama 3.3 70B" }
  ],
  groq:[
    { id:"llama-3.3-70b-versatile", label:"Groq · Llama 3.3 70B Versatile" },
    { id:"llama-3.1-8b-instant", label:"Groq · Llama 3.1 8B Instant" },
    { id:"gemma2-9b-it", label:"Groq · Gemma2 9B" }
  ]
};

export const HINTS = {
  gemini:'金鑰在 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> 取得',
  openai:'金鑰在 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">platform.openai.com/api-keys</a> 取得',
  openrouter:'金鑰在 <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">openrouter.ai/settings/keys</a> 取得',
  groq:'金鑰在 <a href="https://console.groq.com/keys" target="_blank" rel="noopener">console.groq.com/keys</a> 取得'
};
export const KEY_PLACEHOLDERS = {
  gemini:"貼上 Google Gemini API Key…", openai:"貼上 OpenAI API Key…",
  openrouter:"貼上 OpenRouter API Key…", groq:"貼上 Groq API Key…"
};

export function parseJSON(text){
  if(!text) throw new Error("模型未回傳任何內容。");
  let cleaned = text.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");
  const s = cleaned.indexOf("{"), e = cleaned.lastIndexOf("}");
  if(s===-1||e===-1||e<s) throw new Error("無法解析模型回傳的 JSON。");
  return JSON.parse(cleaned.slice(s,e+1));
}

async function callGemini(key, model, prompt, images){
  const body = {
    contents:[{ parts:[{ text:prompt }].concat((images||[]).map(im=>({ inlineData:{ mimeType:im.mime, data:im.data } }))) }],
    generationConfig:{ temperature:0.7, responseMimeType:"application/json" }
  };
  const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key),{
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body)
  });
  let data; try{ data=await res.json(); }catch(e){ data=null; }
  if(!res.ok){
    const msg = data&&data.error&&data.error.message ? (data.error.status?data.error.status+"：":"")+data.error.message : "HTTP "+res.status;
    throw new Error(msg);
  }
  const text = data&&data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts[0].text;
  if(!text) throw new Error("Gemini 未回傳可用內容（可能被安全設定阻擋）。");
  return parseJSON(text);
}

async function callChat(key, url, model, prompt, images){
  const content = [{ type:"text", text:prompt }].concat((images||[]).map(im=>({ type:"image_url", image_url:{ url:im.data } })));
  const res = await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
    body:JSON.stringify({ model, temperature:0.7, messages:[
      { role:"system", content:"你是企業改善提案撰寫專家，一律只回傳 JSON 物件，不要加任何額外文字。" },
      { role:"user", content }
    ]})
  });
  let data; try{ data=await res.json(); }catch(e){ data=null; }
  if(!res.ok){
    const msg = data&&data.error&&data.error.message ? data.error.message : "HTTP "+res.status;
    throw new Error(msg);
  }
  const text = data&&data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content;
  if(!text) throw new Error("模型未回傳可用內容。");
  return parseJSON(text);
}

export function callForProvider(provider, key, model, prompt, images){
  images = images || [];
  if(provider==="gemini") return callGemini(key,model,prompt,images);
  if(provider==="openai") return callChat(key,"https://api.openai.com/v1/chat/completions",model,prompt,images);
  if(provider==="openrouter") return callChat(key,"https://openrouter.ai/api/v1/chat/completions",model,prompt,images);
  return callChat(key,"https://api.groq.com/openai/v1/chat/completions",model,prompt,images);
}

const OPENAI_EXCLUDE = /(embedding|whisper|tts|moderation|transcrib|translat|dall-e|image|audio|speech|realtime|davinci|babbage|instruct|fine-?tune|rerank|search|similarity|classifier|summariz)/i;

export async function fetchModels(provider, key){
  let res;
  if(provider==="gemini"){
    res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key="+encodeURIComponent(key));
    const data = await res.json().catch(()=>null);
    if(!res.ok) throw new Error((data&&data.error&&data.error.message)||("HTTP "+res.status));
    const list = (data.models||[]).filter(m=>(m.supportedGenerationMethods||[]).indexOf("generateContent")!==-1)
      .map(m=>({ id:m.name.replace(/^models\//,""), label:(m.displayName?m.displayName+" · ":"")+m.name.replace(/^models\//,"") }));
    list.sort((a,b)=>a.id<b.id?-1:1);
    return list;
  }
  const url = provider==="openai" ? "https://api.openai.com/v1/models"
    : provider==="openrouter" ? "https://openrouter.ai/api/v1/models"
    : "https://api.groq.com/openai/v1/models";
  res = await fetch(url,{ headers:{ Authorization:"Bearer "+key } });
  const d = await res.json().catch(()=>null);
  if(!res.ok) throw new Error((d&&d.error&&d.error.message)||("HTTP "+res.status));
  let ids = (d.data||[]).map(m=>m.id);
  if(provider==="openai") ids = ids.filter(id=>!OPENAI_EXCLUDE.test(id));
  if(provider==="groq") ids = ids.filter(id=>!/(whisper|embedding|tts)/i.test(id));
  let list = ids.map(id=>({ id, label:id }));
  if(provider==="openrouter"){
    list = (d.data||[]).filter(m=>!/embedding/i.test(m.id)).map(m=>({ id:m.id, label:(m.name&&m.name!==m.id?m.name+" · ":"")+m.id }));
  }
  list.sort((a,b)=>a.id<b.id?-1:1);
  return list;
}

export function getModel(){
  return state.models[state.provider];
}
export function getKey(){
  return state.keys[state.provider];
}
