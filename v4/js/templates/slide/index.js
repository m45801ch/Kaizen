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
    const photosBefore = (d.photos&&d.photos.before)||[];
    const photosAfter = (d.photos&&d.photos.after)||[];
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+
        (photosBefore.length?'<div class="slide-photo"><span class="slide-photo-tag">改善前</span><img src="'+esc(photosBefore[0].previewDataUrl||photosBefore[0].dataUrl)+'" alt="改善前"></div>':"")+
        (photosAfter.length?'<div class="slide-photo"><span class="slide-photo-tag">改善後</span><img src="'+esc(photosAfter[0].previewDataUrl||photosAfter[0].dataUrl)+'" alt="改善後"></div>':"")+
      "</div>"
      : "";
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title">'+esc(s.slideTitle||d.title||"改善提案")+'</div>'+
      '<div class="slide-body">'+
        '<ul class="slide-points">'+(points.length?points.map(k=>"<li>"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+"</ul>"+
        '<div class="slide-benefits">'+(benefits.length?benefits.map(b=>'<div class="sb-item">'+esc(b)+"</div>").join(""):"")+"</div>"+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
  }
};
