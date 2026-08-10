/* 一頁式簡報模板（AI 簡報生成結果渲染） */
import { esc } from "../shared.js";

function gaBarChart(benefits){
  const colors=["#F2B705","#E8590C","#D63426"];
  const vals = benefits.map(b=>{
    const m = /(\d+(?:\.\d+)?)\s*%/.exec(String(b));
    return m ? Math.max(0, Math.min(100, parseFloat(m[1]))) : Math.round(100/benefits.length);
  });
  const barW = Math.min(34, Math.max(10, 260/benefits.length));
  const bars = benefits.map((b,i)=>{
    const h = Math.max(4, Math.round(vals[i]/100*120));
    const y = 130 - h;
    return '<g><rect x="'+(i*barW+8)+'" y="'+y+'" width="'+(barW-6)+'" height="'+h+'" fill="'+colors[i%3]+'" rx="2"></rect>'+
      '<text x="'+(i*barW+barW/2+2)+'" y="142" text-anchor="middle" fill="#E2E8F0" font-size="11">'+esc(vals[i])+'%</text></g>';
  }).join("");
  const labels = benefits.map((b,i)=>'<div class="sc-label" style="--sc:'+colors[i%3]+'">'+esc(b)+"</div>").join("");
  return '<div class="slide-chart">'+
    '<div class="sc-cap">效益達成度</div>'+
    '<svg viewBox="0 0 280 150" class="sc-svg">'+bars+"</svg>"+
    '<div class="sc-labels">'+labels+"</div>"+
  "</div>";
}

function gaPieChart(benefits){
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
  const labels = benefits.map((b,i)=>'<div class="sc-label" style="--sc:'+colors[i%colors.length]+'">'+esc(b)+"</div>").join("");
  return '<div class="slide-chart">'+
    '<div class="sc-cap">效益達成度</div>'+
    '<svg viewBox="0 0 280 150" class="sc-svg">'+segs.join("")+"</svg>"+
    '<div class="sc-labels">'+labels+"</div>"+
  "</div>";
}

function gaChart(benefits, chartType){
  return chartType==="pie" ? gaPieChart(benefits) : gaBarChart(benefits);
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
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+
        (photosBefore[0]?'<div class="slide-photo"><span class="slide-photo-tag">改善前</span><img src="'+esc(photosBefore[0].previewDataUrl||photosBefore[0].dataUrl)+'" alt="改善前"></div>':"")+
        (photosAfter[0]?'<div class="slide-photo"><span class="slide-photo-tag">改善後</span><img src="'+esc(photosAfter[0].previewDataUrl||photosAfter[0].dataUrl)+'" alt="改善後"></div>':"")+
      "</div>"
      : "";
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title">'+esc(s.slideTitle||d.title||"改善提案")+'</div>'+
      '<div class="slide-body">'+
        '<ul class="slide-points">'+(points.length?points.map(k=>"<li>"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+"</ul>"+
        (benefits.length?'<div class="slide-benefits">'+gaChart(benefits, chartType)+"</div>":"")+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
  }
};
