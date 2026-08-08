/* 品質管理模板：藍色主題、含責任單位與檢驗標準欄位 */
import { esc, docHeader, titleField, photoZone, analysisArea, benefitBox } from "../shared.js";

export default {
  id:"quality",
  name:"品質管理",
  desc:"品質管理專用：藍色主題、含責任單位與檢驗標準欄位。",
  render(d, h){
    const unit = d.extra && d.extra.qualityUnit ? d.extra.qualityUnit : "";
    const std = d.extra && d.extra.qualityStd ? d.extra.qualityStd : "";
    const extraRow = '<div class="title-field"><div class="title-row">'+
      '<span class="title-label">責任單位：</span>'+
      '<input type="text" id="f-quality-unit" class="title-input" value="'+esc(unit)+'" placeholder="例：品管課">'+
      '<span class="title-label" style="margin-left:14px">檢驗標準：</span>'+
      '<input type="text" id="f-quality-std" class="title-input" value="'+esc(std)+'" placeholder="例：抽樣 30 件/批">'+
    "</div></div>";
    return docHeader(d)+titleField(d)+extraRow+
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
