/* 圖片編輯器控制器：非破壞式疊加編輯 */
import { drawOverlay, cropOverlay } from "./tools.js";
import { state, persistImages } from "../store.js";

const $ = id => document.getElementById(id);
let current=null;      // { side, id }
let editing=null;      // { img:HTMLImageElement, overlay, canvas, ctx, scale, offsetX, offsetY }
let tool="rect", color="#EF4444", width=4, fontSize=32;
let undoStack=[];

const TOOLS=[
  ["rect","框線",'<rect x="3" y="3" width="18" height="18" rx="2"/>'],
  ["draw","塗鴉",'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4"/>'],
  ["arrow","箭頭",'<path d="M5 12h14m-7-7l7 7l-7 7"/>'],
  ["text","文字",'<path d="M12 4v16M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M9 20h6"/>'],
  ["crop","裁剪",'<g><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></g>'],
  ["rotate","旋轉",'<g><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></g>']
];
const SWATCHES=["#EF4444","#F97316","#EAB308","#22C55E","#3B82F6","#8B5CF6","#111827","#FFFFFF"];

function svgIcon(p){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+"</svg>"; }

export function initEditor(){
  /* 建構模態框 */
  const modal=document.createElement("div");
  modal.className="editor-modal"; modal.id="editorModal";
  modal.innerHTML=
  '<div class="editor-card">'+
    '<div class="editor-toolbar" id="editorToolbar">'+
      TOOLS.map(([id,name,ic])=>'<button type="button" class="tool'+(id==="rect"?" active":"")+'" data-tool="'+id+'" title="'+name+'">'+svgIcon(ic)+"</button>").join("")+
      '<span class="sep"></span>'+
      '<div class="color-swatches" id="editorSwatches">'+SWATCHES.map(c=>'<span class="swatch'+(c==="#EF4444"?" active":"")+'" data-color="'+c+'" style="background:'+c+'"></span>').join("")+"</div>"+
      '<span class="sep"></span>'+
      '<label class="font-size-wrap">字<output id="editorFontSizeVal" for="editorFontSize">32</output>px</label>'+
      '<input type="range" id="editorFontSize" min="12" max="96" step="1" value="32">'+
      '<span class="sep"></span>'+
      '<button type="button" class="tool" id="toolUndo" title="復原">↶</button>'+
      '<button type="button" class="tool" id="toolClear" title="清除疊加">清除</button>'+
    "</div>"+
    '<div class="editor-canvas-wrap" id="editorCanvasWrap"><canvas id="editorCanvas" class="editor-canvas"></canvas></div>'+
    '<div class="editor-footer">'+
      '<span class="hint" id="editorHint">拖曳以繪製</span>'+
      '<div style="display:flex;gap:8px">'+
        '<button type="button" class="btn btn-outline btn-sm" id="editorCancel">取消</button>'+
        '<button type="button" class="btn btn-primary btn-sm" id="editorDone" style="width:auto">完成</button>'+
      "</div>"+
    "</div>"+
  "</div>";
  document.body.appendChild(modal);

  /* 工具列 */
  modal.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    if(b.dataset.tool==="rotate"){ rotateImage(); return; }
    tool=b.dataset.tool;
    modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));
    updateHint();
  }));
  modal.querySelectorAll("[data-color]").forEach(s=>s.addEventListener("click",()=>{
    color=s.dataset.color;
    modal.querySelectorAll("[data-color]").forEach(x=>x.classList.toggle("active",x===s));
  }));
  const fsRange=$("editorFontSize"), fsVal=$("editorFontSizeVal");
  fsRange.addEventListener("input",()=>{
    fontSize=parseInt(fsRange.value,10);
    fsVal.textContent=fontSize;
  });
  $("toolUndo").addEventListener("click",undo);
  $("toolClear").addEventListener("click",()=>{ if(editing){ const ov=editing.overlay; if(ov&&(ov.rects.length||ov.strokes.length||ov.arrows.length||ov.texts.length||ov.crop||ov.rotate)) pushUndo(); editing.overlay={rects:[],strokes:[],arrows:[],texts:[],crop:null,rotate:0}; redraw(); } });

  /* 畫布互動 */
  const canvas=$("editorCanvas"), ctx=canvas.getContext("2d");
  let drawing=null;
  canvas.addEventListener("pointerdown",e=>{
    if(!editing) return;
    const p=toImg(e);
    if(tool==="text"){
      const t=prompt("輸入文字：","");
      if(t){ pushUndo(); editing.overlay.texts.push({ x:p.x, y:p.y, text:t, color, size:fontSize, bold:true }); redraw(); }
      return;
    }
    pushUndo();
    drawing={ sx:p.x, sy:p.y, cx:p.x, cy:p.y };
    if(tool==="draw"){ editing.overlay.strokes.push({ points:[p], color, width }); }
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove",e=>{
    if(!drawing) return;
    const p=toImg(e);
    drawing.cx=p.x; drawing.cy=p.y;
    if(tool==="draw"){
      const s=editing.overlay.strokes[editing.overlay.strokes.length-1];
      s.points.push(p); redraw();
    } else redraw(true, drawing);
  });
  canvas.addEventListener("pointerup",()=>{
    if(!drawing) return;
    const d=drawing;
    const rect={ x:Math.min(d.sx,d.cx), y:Math.min(d.sy,d.cy), w:Math.abs(d.cx-d.sx), h:Math.abs(d.cy-d.sy) };
    if(tool==="rect"){ editing.overlay.rects.push({x:rect.x,y:rect.y,w:rect.w,h:rect.h,color,width}); }
    if(tool==="arrow"){ editing.overlay.arrows.push({x1:d.sx,y1:d.sy,x2:d.cx,y2:d.cy,color,width}); }
    if(tool==="crop"){ applyCrop(rect); }
    drawing=null; redraw();
  });

  /* 完成/取消 */
  $("editorDone").addEventListener("click",()=>{ commit(); });
  $("editorCancel").addEventListener("click",()=>closeEditor());
  modal.addEventListener("click",e=>{ if(e.target===modal) closeEditor(); });
  window.addEventListener("keydown",e=>{ if(e.key==="Escape") closeEditor(); });

  /* 監聽編輯事件 */
  window.addEventListener("kaizen:edit-photo",e=>openEditor(e.detail.side, e.detail.id));
}

function updateHint(){
  const hints={rect:"拖曳以繪製框線",draw:"按住拖曳以塗鴉",arrow:"拖曳以繪製箭頭",text:"點擊加入文字",crop:"拖曳選取要保留的區域"};
  $("editorHint").textContent=hints[tool]||"";
}

function toImg(e){
  const c=$("editorCanvas"), r=c.getBoundingClientRect();
  const rot=((editing.overlay.rotate||0)%360);
  const crop=editing.overlay.crop;
  const iw=crop?crop.w:editing.img.width, ih=crop?crop.h:editing.img.height;
  let x=e.clientX-r.left - c.width/2;
  let y=e.clientY-r.top - c.height/2;
  if(rot===90){ const t=x; x=y; y=-t; }
  else if(rot===180){ x=-x; y=-y; }
  else if(rot===270){ const t=x; x=-y; y=t; }
  return { x:x/editing.scale + iw/2, y:y/editing.scale + ih/2 };
}
function fromImg(px,py){ return { x:editing.offsetX+px*editing.scale, y:editing.offsetY+py*editing.scale }; }

function redraw(preview, d){
  const c=$("editorCanvas"), ctx=c.getContext("2d");
  const rot=((editing.overlay.rotate||0)%360);
  const rot90=rot%180===90;
  const crop=editing.overlay.crop;
  const iw=crop?crop.w:editing.img.width, ih=crop?crop.h:editing.img.height;
  const s=editing.scale;
  const cw=rot90?ih*s:iw*s, ch=rot90?iw*s:ih*s;
  const dw=Math.round(iw*s), dh=Math.round(ih*s);
  if(c.width!==Math.round(cw)||c.height!==Math.round(ch)){ c.width=Math.round(cw); c.height=Math.round(ch); }
  ctx.clearRect(0,0,c.width,c.height);
  ctx.save();
  ctx.translate(c.width/2,c.height/2);
  ctx.rotate(rot*Math.PI/180);
  ctx.drawImage(editing.img, crop?crop.x:0, crop?crop.y:0, iw, ih, -dw/2, -dh/2, dw, dh);
  ctx.scale(s,s);
  ctx.translate(-iw/2,-ih/2);
  drawOverlay(ctx, editing.overlay);
  if(preview&&d){
    ctx.strokeStyle=color; ctx.lineWidth=width;
    if(tool==="rect"||tool==="crop"){
      const r={ x:Math.min(d.sx,d.cx), y:Math.min(d.sy,d.cy), w:Math.abs(d.cx-d.sx), h:Math.abs(d.cy-d.sy) };
      if(tool==="crop"){ ctx.strokeStyle="#DC2626"; ctx.setLineDash([6,4]); }
      ctx.strokeRect(r.x,r.y,r.w,r.h);
      ctx.setLineDash([]);
    }
    if(tool==="arrow"){ ctx.beginPath(); ctx.moveTo(d.sx,d.sy); ctx.lineTo(d.cx,d.cy); ctx.stroke(); }
  }
  ctx.restore();
}

function openEditor(side,id){
  const photo=(state.images[side]||[]).find(p=>p.id===id);
  if(!photo) return;
  const img=new Image();
  img.onload=()=>{
    editing={ img, overlay:photo.overlay?JSON.parse(JSON.stringify(photo.overlay)):{rects:[],strokes:[],arrows:[],texts:[],crop:null,rotate:0}, scale:1, offsetX:0, offsetY:0 };
    current={side,id};
    undoStack=[];
    $("editorModal").classList.add("show");
    const wrap=$("editorCanvasWrap");
    const crop=editing.overlay.crop;
    const rot=((editing.overlay.rotate||0)%360);
    const rot90=rot%180===90;
    const iw=crop?crop.w:img.width, ih=crop?crop.h:img.height;
    const fw=rot90?ih:iw, fh=rot90?iw:ih;
    const maxW=(wrap?wrap.clientWidth:1200)-40;
    const maxH=(wrap?wrap.clientHeight:760)-40;
    const MAX=4;
    let s=Math.min(MAX,maxW/fw,maxH/fh);
    if(s<=0) s=1;
    editing.scale=s;
    redraw();
    updateHint();
  };
  img.src=photo.dataUrl;
}
function closeEditor(){
  $("editorModal").classList.remove("show");
  current=null; editing=null;
}
function rotateImage(){
  if(!editing) return;
  pushUndo();
  editing.overlay.rotate=((editing.overlay.rotate||0)+90)%360;
  redraw();
}
function pushUndo(){
  undoStack.push(JSON.stringify(editing.overlay));
  if(undoStack.length>50) undoStack.shift();
}
function undo(){
  if(!editing||!undoStack.length) return;
  editing.overlay=JSON.parse(undoStack.pop());
  redraw();
}
function applyCrop(r){
  if(!r||r.w<10||r.h<10){ undoStack.pop(); return; }
  const base=editing.overlay.crop;
  const bx=base?base.x:0, by=base?base.y:0;
  const x=Math.max(0,Math.round(r.x)), y=Math.max(0,Math.round(r.y));
  const w=Math.min((base?base.w:editing.img.width)-x, Math.round(r.w));
  const h=Math.min((base?base.h:editing.img.height)-y, Math.round(r.h));
  if(w<10||h<10){ undoStack.pop(); return; }
  const shifted=cropOverlay(editing.overlay, {x,y,w,h});
  shifted.crop={ x:bx+x, y:by+y, w, h };
  editing.overlay=shifted;
  redraw();
}
function renderComposite(){
  const img=editing.img, ov=editing.overlay;
  let bw=img.width,bh=img.height,sx=0,sy=0,sw=img.width,sh=img.height;
  if(ov.crop){ bw=ov.crop.w; bh=ov.crop.h; sx=ov.crop.x; sy=ov.crop.y; sw=ov.crop.w; sh=ov.crop.h; }
  let fw=bw,fh=bh;
  const rot=((ov.rotate||0)%360);
  if(rot%180===90){ fw=bh; fh=bw; }
  const c=document.createElement("canvas"); c.width=fw; c.height=fh;
  const ctx=c.getContext("2d");
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,fw,fh);
  ctx.save();
  ctx.translate(fw/2, fh/2);
  ctx.rotate(rot*Math.PI/180);
  ctx.drawImage(img, sx, sy, sw, sh, -bw/2, -bh/2, bw, bh);
  ctx.translate(-bw/2, -bh/2);
  drawOverlay(ctx, ov);
  ctx.restore();
  return c.toDataURL("image/jpeg",0.9);
}
function commit(){
  if(!editing) return;
  const photo=state.images[current.side].find(p=>p.id===current.id);
  if(!photo) return;
  photo.overlay=editing.overlay;
  photo.previewDataUrl=renderComposite();
  window.dispatchEvent(new CustomEvent("kaizen:photos-changed"));
  persistImages();
  closeEditor();
}
