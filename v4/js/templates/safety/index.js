/* 工安模板：警示黃×黑、危險等級色塊、工安風預期效益 */
import { esc, docHeader, titleField, photoZone, analysisArea } from "../shared.js";
import { escEmphasis } from "../../analysis.js";

function gaBenefitBox(d){
  const items=[
    ['fa-yellow', d.benefits[0]],
    ['fa-orange', d.benefits[1]],
    ['fa-red',    d.benefits[2]]
  ];
  const icons={
    'fa-yellow':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l10 18H2z"/><path d="M12 10v4m0 3h.01"/></svg>',
    'fa-orange':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M12 8v5m0 3h.01"/></svg>',
    'fa-red':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7 7 .6-5.4 4.8 1.7 7L12 18.3 5.7 21.4l1.7-7L2 9.6 9 9z"/></svg>'
  };
  return '<div class="ga-benefit-box">'+
    '<div class="ga-benefit-cap">預期效益</div>'+
    '<div class="ga-benefit-cols">'+items.map((it,idx)=>{
      const cls=it[0], val=it[1];
      return '<div class="ga-benefit-col '+cls+'"><div class="ga-benefit-icon">'+icons[cls]+"</div>"+
        '<div class="benefit-edit editable" id="f-benefit-'+(idx+1)+'" contenteditable="true" data-benefit="f-benefit-'+(idx+1)+'" placeholder="…">'+escEmphasis(val)+"</div>"+
      "</div>";
    }).join("")+"</div>"+
    '<div class="ga-stripe"></div>'+
  "</div>";
}

export default {
  id:"safety",
  name:"工安",
  desc:"工安專用：警示黃×黑主題、危險等級色塊、工安風預期效益。",
  render(d, h){
    const level = (d.extra && d.extra.safetyLevel) || "";
    const levels = ["高","中","低"];
    const levelRow = '<div class="ga-level-row">'+
      '<span class="ga-level-label">危險等級</span>'+
      levels.map(l=>
        '<button type="button" class="ga-level-chip'+(level===l?" active":"")+'" data-level-set="'+l+'" title="設定危險等級 '+l+'">'+l+"</button>"
      ).join("")+
    "</div>";
    return docHeader(d)+'<div class="ga-stripe"></div>'+titleField(d)+levelRow+
      '<div class="kaizen-pair ga">'+
        '<div class="kaizen-box ga before"><div class="box-cap"><span class="box-no">1</span>改善前（現況說明）</div>'+
          photoZone("before", d.photos)+analysisArea("before", d.before, d.after, h.buildLines)+
        "</div>"+
        '<div class="kaizen-box ga after"><div class="box-cap"><span class="box-no">2</span>改善後（改善對策）</div>'+
          photoZone("after", d.photos)+analysisArea("after", d.before, d.after, h.buildLines)+
        "</div>"+
      "</div>"+
      gaBenefitBox(d);
  }
};
