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

export default {
  id:"slide",
  name:"一頁簡報",
  desc:"一頁式簡報（AI 生成標題、重點、效益與結語）。",
  render(d){
    const s = d.slide || { slideTitle:"", keyPoints:[], benefits:[], conclusion:"" };
    const points = Array.isArray(s.keyPoints)?s.keyPoints:[];
    const benefits = Array.isArray(s.benefits)?s.benefits:[];
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
        (benefits.length?'<div class="slide-benefits">'+gaBarChart(benefits)+"</div>":"")+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
  }
};
