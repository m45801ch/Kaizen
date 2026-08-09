/* 模板共用元件（供各模板 render 使用） */
export function esc(s){
  return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
export function docHeader(d){
  return '<div class="doc-header">'+
    '<div class="logo"><img id="logoImg" alt="公司LOGO"></div>'+
    '<div class="doc-title serif" id="docTitle" contenteditable="true">'+esc(d.docTitle||"改善提案表")+"</div>"+
    '<div class="logo-side" aria-hidden="true"></div>'+
  "</div>";
}
export function titleField(d){
  return '<div class="title-field"><div class="title-row">'+
    '<span class="title-label">改善主題：</span>'+
    '<input type="text" id="f-title" class="title-input" value="'+esc(d.title)+'" placeholder="輸入改善主題…">'+
    '<span class="attach-mark">（附件）</span>'+
  "</div></div>";
}
export function photoZone(side, photos){
  const list = photos[side]||[];
  let thumbs = list.map(p=>{
    const ratio = (p.w && p.h) ? p.h/p.w : 1;
    const w = p.dispW || 260;
    const h = p.dispH || Math.max(40, Math.round(260*ratio));
    const x = p.dispX || 0, y = p.dispY || 0;
    return '<div class="photo-thumb" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px">'+
      '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+esc(p.name||"照片")+'">'+
      '<button type="button" class="remove" data-remove="'+esc(p.id)+'" title="移除照片">✕</button>'+
      '<button type="button" class="edit-btn" data-edit="'+esc(p.id)+'" title="編輯照片">✎</button>'+
      '<button type="button" class="center-btn" data-center="'+esc(p.id)+'" title="置中">◎</button>'+
      '<span class="resize-handle" data-resize="'+esc(p.id)+'" title="調整尺寸"></span>'+
    "</div>";
  }).join("");
  return '<div class="photo-zone" id="photo-zone-'+side+'">'+
    '<div class="photo-grid" id="photo-grid-'+side+'">'+thumbs+"</div>"+
    '<div class="photo-empty" id="photo-empty-'+side+'"'+(list.length?' style="display:none"':"")+'>尚未上傳'+ (side==="before"?"改善前":"改善後") +"照片</div>"+
    '<button type="button" class="photo-add" id="photo-add-'+side+'">＋ 上傳照片（可多張）</button>'+
    '<input type="file" id="photo-input-'+side+'" accept="image/*" multiple hidden>'+
  "</div>";
}
export function analysisArea(side, before, after, buildLines){
  const val = side==="before"?before:after;
  return '<div class="analysis">'+
    '<div class="analysis-preview" id="analysis-preview-'+side+'" role="textbox" tabindex="0">'+(val&&val.trim()?buildLines(val):"")+"</div>"+
    '<textarea class="editable analysis-edit" id="f-'+side+'" rows="2" placeholder="描述'+(side==="before"?"改善前的問題":"改善的對策")+'…">'+esc(val)+"</textarea>"+
  "</div>";
}
export function benefitBox(d){
  const rows=[
    ["f-benefit-1",d.benefits[0]||"",'<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/>'],
    ["f-benefit-2",d.benefits[1]||"",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'],
    ["f-benefit-3",d.benefits[2]||"",'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1.1-3 2.5 1.5 2 3 2.5 3 1.1 3 2.5-1.3 2.5-3 2.5-3-1.1-3-2.5"/>']
  ];
  return '<div class="benefit-box">'+
    '<div class="box-cap"><span class="box-no">3</span>預期效益</div>'+
    '<div class="benefit-cols">'+rows.map(([id,v,ic])=>
      '<div class="benefit-col"><div class="benefit-row">'+
      '<div class="benefit-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+ic+"</svg></div>"+
      '<textarea class="editable" id="'+id+'" rows="1" placeholder="…">'+esc(v)+"</textarea>"+
      "</div></div>"
    ).join("")+"</div></div>";
}
