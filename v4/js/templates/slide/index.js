/* 一頁式簡報模板（AI 簡報生成結果渲染） */
import { esc } from "../shared.js";

function gaChartBlock(benefits, chartType){
  const svg = chartType==="pie" ? gaPieSvg(benefits) : gaBarSvg(benefits);
  const labels = benefits.map((b,i)=>{
    const colors = chartType==="pie" ? ["#F2B705","#E8590C","#D63426","#3B82F6","#22C55E","#A855F7"] : ["#F2B705","#E8590C","#D63426"];
    return '<div class="sc-label" contenteditable="true" data-slide-field="benefits-'+i+'" style="--sc:'+colors[i%colors.length]+'">'+esc(b)+"</div>";
  }).join("");
  return '<div class="slide-chart">'+
    '<div class="sc-cap">效益達成度</div>'+
    '<svg viewBox="0 0 280 150" class="sc-svg">'+svg+"</svg>"+
    '<div class="sc-labels">'+labels+"</div>"+
  "</div>";
}

function gaBarSvg(benefits){
  const colors=["#F2B705","#E8590C","#D63426"];
  const vals = benefits.map(b=>{
    const m = /(\d+(?:\.\d+)?)\s*%/.exec(String(b));
    return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : Math.round(100/benefits.length);
  });
  const barW = Math.min(34, Math.max(10, 260/benefits.length));
  return benefits.map((b,i)=>{
    const h = Math.max(4, Math.round(vals[i]/100*120));
    const y = 130 - h;
    return '<g><rect x="'+(i*barW+8)+'" y="'+y+'" width="'+(barW-6)+'" height="'+h+'" fill="'+colors[i%3]+'" rx="2"></rect>'+
      '<text x="'+(i*barW+barW/2+2)+'" y="142" text-anchor="middle" fill="#E2E8F0" font-size="11">'+esc(vals[i])+'%</text></g>';
  }).join("");
}

function gaPieSvg(benefits){
  const colors=["#F2B705","#E8590C","#D63426","#3B82F6","#22C55E","#A855F7"];
  const vals = benefits.map(b=>{
    const m = /(\d+(?:\.\d+)?)\s*%/.exec(String(b));
    return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : Math.round(100/benefits.length);
  });
  const total = vals.reduce((a,v)=>a+v,0) || 1;
  const cx=140, cy=75, r=55;
  const segs = [];
  let a = -Math.PI/2;
  vals.forEach((v,i)=>{
    const frac = v/total;
    const a1 = a + frac*Math.PI*2;
    const x0 = cx + r*Math.cos(a), y0 = cy + r*Math.sin(a);
    const x1 = cx + r*Math.cos(a1), y1 = cy + r*Math.sin(a1);
    const big = frac>0.5?1:0;
    const mx = cx + r*0.35*Math.cos((a+a1)/2), my = cy + r*0.35*Math.sin((a+a1)/2);
    const pct = Math.round(v);
    segs.push(
      '<path d="M'+cx+','+cy+' L'+x0.toFixed(2)+','+y0.toFixed(2)+' A'+r+','+r+' 0 '+big+' 1 '+x1.toFixed(2)+','+y1.toFixed(2)+' Z" fill="'+colors[i%colors.length]+'" stroke="#0B1220" stroke-width="1"></path>'+
      '<text x="'+mx.toFixed(2)+'" y="'+(my+4).toFixed(2)+'" text-anchor="middle" fill="#0B1220" font-size="10" font-weight="600">'+pct+'%</text>'
    );
    a = a1;
  });
  return segs.join("");
}

export function gaChartSvg(benefits, chartType){
  return gaChartBlock(benefits, chartType==="pie" ? "pie" : "bar");
}

export default {
  id:"slide",
  name:"一頁簡報",
  desc:"一頁式簡報（AI 生成標題、重點、效益與結語）。",
  render(d){
    const s = d.slide || { slideTitle:"", keyPoints:[], benefits:[], conclusion:"" };
    const points = Array.isArray(s.keyPoints)?s.keyPoints:[];
    const benefits = Array.isArray(s.benefits)?s.benefits:[];
    const chartType = s.chartType==="pie" ? "pie" : "bar";
    const photosBefore = (d.photos&&d.photos.before)||[];
    const photosAfter = (d.photos&&d.photos.after)||[];
    const slidePhoto = (p, label, side)=>{
      if(!p) return "";
      const ratio = (p.w && p.h) ? p.h/p.w : 1;
      const sz = (d.slidePhotoSize && d.slidePhotoSize[p.id]) || null;
      const pos = (d.slidePhotoPos && d.slidePhotoPos[p.id]) || null;
      const z = (d.slideZ && d.slideZ[p.id]) ?? 5;
      const w = sz ? sz.w : 240;
      const h = sz ? sz.h : Math.max(40, Math.round(240*ratio));
      const style = (pos ? 'left:'+pos.x+'px;top:'+pos.y+'px' : (side==="after" ? 'left:auto;right:8px;top:8px' : 'left:8px;top:8px'))+';z-index:'+z;
      return '<div class="slide-photo" data-slide-pos="'+esc(p.id)+'" style="'+style+'"><span class="slide-photo-tag">'+label+'</span>'+
        '<div class="slide-photo-frame" data-slide-photo="'+esc(p.id)+'" style="width:'+w+'px;height:'+h+'px">'+
        '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+label+'">'+
        '<span class="resize-handle" data-slide-resize="'+esc(p.id)+'" title="調整尺寸"></span>'+
        "</div>"+
        '<span class="slide-z-btns">'+
          '<button type="button" data-slide-z="+1" title="上移一層">↑</button>'+
          '<button type="button" data-slide-z="-1" title="下移一層">↓</button>'+
        "</span>"+
      "</div>";
    };
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? slidePhoto(photosBefore[0], "改善前", "before")+slidePhoto(photosAfter[0], "改善後", "after")
      : "";
    const blockStyle = (key)=>{
      const pos = (d.slideBlockPos && d.slideBlockPos[key]) || null;
      const z = (d.slideBlockZ && d.slideBlockZ[key]) ?? 1;
      const def = {
        title:'left:36px;top:28px',
        points:'left:36px;top:104px',
        benefits:'left:auto;right:36px;top:104px',
        conclusion:'left:36px;bottom:28px'
      }[key] || '';
      const posStyle = pos ? 'left:'+pos.x+'px;top:'+pos.y+'px' : def;
      return 'data-slide-block="'+key+'" style="'+posStyle+';z-index:'+z+'"';
    };
    const zbtns = (key)=>'<span class="slide-z-btns">'+
      '<button type="button" data-slide-block-z="+1" title="上移一層">↑</button>'+
      '<button type="button" data-slide-block-z="-1" title="下移一層">↓</button>'+
    "</span>";
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title" contenteditable="true" data-slide-field="slideTitle" '+blockStyle("title")+'>'+esc(s.slideTitle||d.title||"改善提案")+zbtns("title")+"</div>"+
      '<div class="slide-body">'+
        '<ul class="slide-points" '+blockStyle("points")+'>'+(points.length?points.map((k,i)=>"<li contenteditable=\"true\" data-slide-field=\"keyPoints-"+i+"\">"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+zbtns("points")+"</ul>"+
        (benefits.length?'<div class="slide-benefits" '+blockStyle("benefits")+'>'+gaChartBlock(benefits, chartType)+zbtns("benefits")+"</div>":"")+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion" contenteditable="true" data-slide-field="conclusion" '+blockStyle("conclusion")+'>'+esc(s.conclusion||"")+zbtns("conclusion")+"</div>"+
    "</div>";
  }
};
