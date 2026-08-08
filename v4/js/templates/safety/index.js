/* 施工安全模板：橘色主題、改善前後堆疊、危險等級欄位 */
import { esc, docHeader, titleField, photoZone, analysisArea, benefitBox } from "../shared.js";

export default {
  id:"safety",
  name:"施工安全",
  desc:"施工安全專用：橘色主題、改善前後上下排列、含危險等級欄位。",
  render(d, h){
    const level = d.extra && d.extra.safetyLevel ? d.extra.safetyLevel : "";
    const levelRow = '<div class="title-field"><div class="title-row">'+
      '<span class="title-label">危險等級：</span>'+
      '<input type="text" id="f-safety-level" class="title-input" value="'+esc(level)+'" placeholder="高 / 中 / 低">'+
    "</div></div>";
    return docHeader(d)+titleField(d)+levelRow+
      '<div class="kaizen-pair">'+
        '<div class="kaizen-box before"><div class="box-cap"><span class="box-no">1</span>改善前（現況說明）</div>'+
          photoZone("before", d.photos)+analysisArea("before", d.before, d.after, h.buildLines)+
        "</div>"+
        '<div class="kaizen-box after"><div class="box-cap"><span class="box-no">2</span>改善後（改善對策）</div>'+
          photoZone("after", d.photos)+analysisArea("after", d.before, d.after, h.buildLines)+
        "</div>"+
      "</div>"+
      benefitBox(d);
  }
};
