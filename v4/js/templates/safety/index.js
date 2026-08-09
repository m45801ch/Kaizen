/* 工安模板：警示黃×黑、改善前後並排、危險等級色塊 */
import { esc, docHeader, titleField, photoZone, analysisArea, benefitBox } from "../shared.js";

export default {
  id:"safety",
  name:"工安",
  desc:"工安專用：警示黃×黑主題、改善前後並排、含危險等級色塊。",
  render(d, h){
    const level = d.extra && d.extra.safetyLevel ? d.extra.safetyLevel : "";
    const levelAttr = (level==="高"||level==="中"||level==="低") ? ' data-level="'+level+'"' : "";
    const levelRow = '<div class="ga-level-row">'+
      '<span class="ga-level-label">危險等級</span>'+
      '<span class="ga-level-chip"'+levelAttr+'>'+esc(level||"—")+"</span>"+
      '<input type="text" id="f-safety-level" class="ga-level-input" value="'+esc(level)+'" placeholder="高 / 中 / 低">'+
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
      '<div class="benefit-box ga">'+benefitBox(d).replace('class="benefit-box"','class="benefit-box ga"')+"</div>";
  }
};
