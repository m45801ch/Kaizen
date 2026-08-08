/* 通用改善提案模板 */
import { esc, docHeader, titleField, photoZone, analysisArea, benefitBox } from "../shared.js";

export default {
  id:"generic",
  name:"通用改善提案",
  desc:"紅／綠改善前後並排，預期效益三欄，適用各類型改善。",
  render(d, h){
    return docHeader(d)+titleField(d)+
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
