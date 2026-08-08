/* 圖片編輯器工具（純繪圖輔助） */
export function drawOverlay(ctx, overlay){
  if(!overlay) return;
  (overlay.rects||[]).forEach(r=>{
    ctx.strokeStyle=r.color; ctx.lineWidth=r.width; ctx.lineJoin="round";
    ctx.strokeRect(r.x,r.y,r.w,r.h);
  });
  (overlay.strokes||[]).forEach(s=>{
    ctx.strokeStyle=s.color; ctx.lineWidth=s.width; ctx.lineCap="round"; ctx.lineJoin="round";
    ctx.beginPath();
    s.points.forEach((p,i)=> i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
  });
  (overlay.arrows||[]).forEach(a=>{
    ctx.strokeStyle=a.color; ctx.lineWidth=a.width; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(a.x1,a.y1); ctx.lineTo(a.x2,a.y2); ctx.stroke();
    const ang=Math.atan2(a.y2-a.y1,a.x2-a.x1), h=Math.max(10,a.width*3), s=Math.max(5,a.width*1.6);
    ctx.beginPath();
    ctx.moveTo(a.x2,a.y2);
    ctx.lineTo(a.x2-h*Math.cos(ang-Math.PI/6), a.y2-h*Math.sin(ang-Math.PI/6));
    ctx.lineTo(a.x2-h*Math.cos(ang+Math.PI/6), a.y2-h*Math.sin(ang+Math.PI/6));
    ctx.closePath(); ctx.fillStyle=a.color; ctx.fill();
  });
  (overlay.texts||[]).forEach(t=>{
    ctx.font=(t.bold?"700 ":"")+t.size+"px sans-serif";
    ctx.fillStyle=t.color; ctx.textBaseline="top";
    ctx.fillText(t.text, t.x, t.y);
  });
  if(overlay.crop){
    ctx.strokeStyle="#DC2626"; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(overlay.crop.x,overlay.crop.y,overlay.crop.w,overlay.crop.h);
    ctx.setLineDash([]);
  }
}

export function cropOverlay(overlay, crop, imgW, imgH){
  /* 將疊加座標從原圖座標轉為裁切後座標（以裁切區域左上為原點） */
  const shift=(pts)=>({ x:pts.x-crop.x, y:pts.y-crop.y });
  const o={ rects:[], strokes:[], arrows:[], texts:[], rotate:overlay.rotate||0 };
  (overlay.rects||[]).forEach(r=>o.rects.push({...r, x:r.x-crop.x, y:r.y-crop.y }));
  (overlay.strokes||[]).forEach(s=>o.strokes.push({...s, points:s.points.map(shift)}));
  (overlay.arrows||[]).forEach(a=>o.arrows.push({...a, x1:a.x1-crop.x, y1:a.y1-crop.y, x2:a.x2-crop.x, y2:a.y2-crop.y }));
  (overlay.texts||[]).forEach(t=>o.texts.push({...t, x:t.x-crop.x, y:t.y-crop.y }));
  return o;
}
