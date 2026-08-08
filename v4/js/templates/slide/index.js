/* 一頁式簡報模板（AI 簡報生成結果渲染） */
import { esc } from "../shared.js";

export default {
  id:"slide",
  name:"一頁簡報",
  desc:"一頁式簡報（AI 生成標題、重點、效益與結語）。",
  render(d){
    const s = d.slide || { slideTitle:"", keyPoints:[], benefits:[], conclusion:"" };
    const points = Array.isArray(s.keyPoints)?s.keyPoints:[];
    const benefits = Array.isArray(s.benefits)?s.benefits:[];
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title">'+esc(s.slideTitle||d.title||"改善提案")+'</div>'+
      '<div class="slide-body">'+
        '<ul class="slide-points">'+(points.length?points.map(k=>"<li>"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+"</ul>"+
        '<div class="slide-benefits">'+(benefits.length?benefits.map(b=>'<div class="sb-item">'+esc(b)+"</div>").join(""):"")+"</div>"+
      "</div>"+
      '<div class="slide-conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
  }
};
