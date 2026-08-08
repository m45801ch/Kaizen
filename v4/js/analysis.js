/* 彩色列點渲染：SVG 圖示、標題著色、重點詞強調 */
const ICON_SEARCH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0-14 0m18 11l-6-6"/></svg>';
const ICON_GEAR='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37c1 .608 2.296.07 2.572-1.065"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 0 0-6 0"/></svg>';
const ICON_WORLD='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0m.6-3h16.8M3.6 15h16.8"/><path d="M11.5 3a17 17 0 0 0 0 18m1-18a17 17 0 0 1 0 18"/></svg>';
const ICON_ALERT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m-1.637-9.409L2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636-2.87L13.637 3.59a1.914 1.914 0 0 0-3.274 0M12 16h.01"/></svg>';
const ICON_TOOL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10h3V7L6.5 3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1-3 3l-6-6a6 6 0 0 1-8-8z"/></svg>';
const ICON_PIN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4.5l-4 4L7 10l-1.5 1.5l7 7L14 17l1.5-4l4-4M9 15l-4.5 4.5M14.5 4L20 9.5"/></svg>';
const ICON_CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12l5 5L20 7"/></svg>';
const ICON_DOT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/></svg>';

function lineIcon(text){
  const map = [
    ["具體現象",ICON_SEARCH],["現象",ICON_SEARCH],["根本成因",ICON_GEAR],["成因",ICON_GEAR],
    ["影響範圍",ICON_WORLD],["範圍",ICON_WORLD],["潛在風險",ICON_ALERT],["風險",ICON_ALERT],
    ["具體對策",ICON_TOOL],["對策",ICON_TOOL],["執行重點",ICON_PIN],["重點",ICON_PIN],
    ["預期效果",ICON_CHECK],["效果",ICON_CHECK]
  ];
  for(const m of map) if(text.indexOf(m[0])===0) return m[1];
  return ICON_DOT;
}
function lineColor(text){
  const pairs=[["具體現象","#2563EB"],["根本成因","#D97706"],["影響範圍","#7C3AED"],["潛在風險","#DC2626"],["具體對策","#16A34A"],["執行重點","#0891B2"],["預期效果","#CA8A04"]];
  for(const p of pairs) if(text.indexOf(p[0])===0) return p[1];
  return "#64748B";
}
function escEmphasis(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.+?)\*\*/g,'<b class="kw">$1</b>');
}
function esc(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

export function buildLines(text){
  const raw = text.split(/\n+/), lines=[];
  raw.forEach(seg=>{
    seg.split(/(?<=[：:])(?=[^：:]{1,14}[：:])/).forEach(part=>{
      const t = part.replace(/^[\s]*[●○•·∙・\-–—－*＊◆■▲▶›»]+[\s:：]*/,"").trim();
      if(t) lines.push(t);
    });
  });
  let html="";
  lines.forEach(t=>{
    let colon = t.indexOf("："); if(colon===-1) colon=t.indexOf(":");
    const head = colon!==-1?t.slice(0,colon):"";
    const rest = colon!==-1?t.slice(colon):t;
    html += '<div class="al-line"><span class="al-emoji">'+lineIcon(t)+"</span>"+
      '<span class="al-text">'+(head?'<span class="al-head" style="color:'+lineColor(t)+'">'+esc(head)+"</span>":"")+escEmphasis(rest)+"</span></div>";
  });
  return html;
}
