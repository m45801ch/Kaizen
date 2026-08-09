# V4 工安模板重新設計 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將「施工安全」模板改為「工安」模板：警示黃×黑配色、現代高對比、黃黑警示斜紋分隔帶、黑框照片卡片並排、強化危險等級色塊。

**Architecture:** 新增 `v4/css/safety.css`（以 `body.tpl-safety` 作用域切換）；`index.html` 引入該 CSS；`main.js` 在 render 流程切換 `body.tpl-safety` class；`safety/index.js` 換用工安 class（`kaizen-pair.ga`/`kaizen-box.ga` 等）並強化危險等級。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/safety/index.js`、`v4/css/safety.css`（新增）、`v4/index.html`、`v4/js/main.js`、`v4/js/templates/index.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 模板 id `safety` **不變**（舊資料相容）；僅顯示名稱改「工安」。
- 語意欄位（title/before/after/benefits/safetyLevel）、照片上傳/拖曳/置中/縮放、AI 生成、列印機制全不變。
- 工安樣式以 `body.tpl-safety` 作用域包覆，不影響 generic/quality/slide。
- 色彩：`--ga-dark:#141414`、`--ga-yellow:#F2B705`、`--ga-yellow-hi:#FFC933`、`--ga-bg:#F5F2EA`、`--ga-white:#FFFFFF`、`--ga-red:#D63426`；斜紋 `repeating-linear-gradient(45deg,#141414 0 12px,#F2B705 12px 24px)`。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 工安模板 HTML 結構與名稱

**Files:**
- Modify: `v4/js/templates/safety/index.js`
- Modify: `v4/js/templates/index.js`（模板卡片名稱）

**Interfaces:**
- Produces: safety 模板 render 換用工安 class（`title-field` 保留、危險等級 `level-row ga`、`kaizen-pair ga`、`kaizen-box ga before/after`）；卡片清單顯示「工安」。

- [ ] **Step 1: 修改 safety 模板 render**

Modify `v4/js/templates/safety/index.js`：將整個檔案替換為：
```js
/* 工安模板：警示黃×黑、改善前後並排、危險等級色塊 */
import { esc, docHeader, titleField, photoZone, analysisArea, benefitBox } from "../shared.js";

export default {
  id:"safety",
  name:"工安",
  desc:"工安專用：警示黃×黑主題、改善前後並排、含危險等級色塊。",
  render(d, h){
    const level = d.extra && d.extra.safetyLevel ? d.extra.safetyLevel : "";
    const levelRow = '<div class="ga-level-row">'+
      '<span class="ga-level-label">危險等級</span>'+
      '<span class="ga-level-chip" data-level="'+(level==="高"||level==="中"||level==="低"?level:"")+'">'+esc(level||"—")+"</span>"+
      '<input type="text" id="f-safety-level" class="ga-level-input" value="'+esc(level)+'" placeholder="高 / 中 / 低">'+
    "</div>";
    return docHeader(d)+titleField(d)+levelRow+
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
```
注意：`benefitBox(d)` 已輸出 `<div class="benefit-box">`，此處用 `replace` 補上 ` ga` class（該字串固定存在，安全）。

- [ ] **Step 2: 模板清單名稱**

Modify `v4/js/templates/index.js`：模板註冊不變（id 仍 `safety`），名稱已在 Task 1 Step 1 改為「工安」。此步驟僅確認 `import safety from "./safety/index.js"` 不變。

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/templates/safety/index.js`
Expected: exit 0，無輸出。

- [ ] **Step 4: Commit**

```bash
git add v4/js/templates/safety/index.js
git commit -m "feat(v4): 工安模板結構與名稱"
```

---

### Task 2: 工安 CSS（新增 safety.css）與引入

**Files:**
- Create: `v4/css/safety.css`
- Modify: `v4/index.html`（引入 CSS）
- Modify: `v4/js/main.js`（body.tpl-safety 切換）

**Interfaces:**
- Produces: `body.tpl-safety` 作用域下的工安樣式（文件背景、斜紋分隔帶、照片卡片、危險等級色塊、效益欄）；`index.html` 引入 `css/safety.css`；`main.js` 於 render 前切換 body class。

- [ ] **Step 1: 建立 `v4/css/safety.css`**

Create `v4/css/safety.css`：
```css
/* ===== 工安模板：警示黃×黑（body.tpl-safety 作用域） ===== */
body.tpl-safety .doc{
  background:#F5F2EA;border:3px solid #141414;border-radius:4px;
  box-shadow:none;padding:28px 30px;
}
body.tpl-safety .doc-header{border-bottom:3px solid #141414;padding-bottom:10px;margin-bottom:0}
body.tpl-safety .ga-stripe{
  height:14px;margin:0 0 10px;
  background:repeating-linear-gradient(45deg,#141414 0 12px,#F2B705 12px 24px);
}
body.tpl-safety .title-field{border-bottom:1px solid #141414}
body.tpl-safety .title-label{color:#141414}
body.tpl-safety .doc-title{color:#141414}
/* 危險等級 */
body.tpl-safety .ga-level-row{
  display:flex;align-items:center;gap:10px;margin:10px 0 16px;flex-wrap:wrap;
}
body.tpl-safety .ga-level-label{
  font-size:13px;font-weight:900;letter-spacing:.05em;color:#141414;
  background:#F2B705;padding:4px 10px;border:2px solid #141414;
}
body.tpl-safety .ga-level-chip{
  min-width:64px;text-align:center;font-size:16px;font-weight:900;color:#fff;
  border:2px solid #141414;padding:6px 14px;
}
body.tpl-safety .ga-level-chip[data-level="高"]{background:#D63426}
body.tpl-safety .ga-level-chip[data-level="中"]{background:#F2B705;color:#141414}
body.tpl-safety .ga-level-chip[data-level="低"]{background:#1F8A3C}
body.tpl-safety .ga-level-chip:not([data-level]){background:#E4DFD3;color:#141414}
body.tpl-safety .ga-level-input{
  flex:1;min-width:120px;border:2px solid #141414;border-radius:0;
  padding:8px 10px;font-size:14px;font-weight:700;font-family:inherit;background:#fff;color:#141414;outline:none;
}
/* 照片卡片 */
body.tpl-safety .kaizen-pair.ga{gap:14px}
body.tpl-safety .kaizen-box.ga{
  border:3px solid #141414;border-radius:4px;background:#fff;box-shadow:none;overflow:hidden;
}
body.tpl-safety .kaizen-box.ga .box-cap{
  background:#F2B705;color:#141414;font-weight:900;letter-spacing:.06em;
}
body.tpl-safety .kaizen-box.ga .box-cap .box-no{
  background:#141414;color:#F2B705;border-radius:3px;
}
body.tpl-safety .kaizen-box.ga .photo-zone{border:2px dashed #141414;border-radius:4px}
body.tpl-safety .kaizen-box.ga .analysis{border:1px solid #141414;border-radius:4px}
/* 效益欄 */
body.tpl-safety .benefit-box.ga{border:3px solid #141414;border-radius:4px}
body.tpl-safety .benefit-box.ga .box-cap{background:#141414;color:#F2B705;font-weight:900}
/* 列印 */
@media print{
  body.tpl-safety .doc{border:3px solid #141414;padding:14mm 12mm}
  body.tpl-safety .ga-stripe{height:10px;background:repeating-linear-gradient(45deg,#141414 0 12px,#F2B705 12px 24px)!important}
  body.tpl-safety .kaizen-box.ga{border:2px solid #141414}
}
```

- [ ] **Step 2: `index.html` 引入 CSS**

Modify `v4/index.html`：在第 11 行 `css/layout.css` 之後加入：
```html
<link rel="stylesheet" href="css/safety.css">
```

- [ ] **Step 3: `main.js` 切換 body class**

Modify `v4/js/main.js`：在 `renderTemplateGrid()`（第 22 行）函式定義之前加入輔助函式，並在 `renderDocument()` 被呼叫的所有路徑生效。最簡做法：新增 `applyTemplateClass()` 並在 `init()` 內、`renderDocument()` 呼叫處呼叫。

(a) 在 `function renderTemplateGrid(){` 之前插入：
```js
function applyTemplateClass(){
  document.body.classList.toggle("tpl-safety", state.template==="safety");
}
```

(b) 在 `init()` 內、`renderDocument();`（第 49 行）之前加入：
```js
  applyTemplateClass();
```

(c) 在 `renderTemplateGrid` 內、模板卡片 click 的 `renderDocument();`（第 37 行）之前加入：
```js
      applyTemplateClass();
```

(d) 在 `kaizen:photos-changed` listener（第 54 行）的 `()=>renderDocument()` 之前加入 `applyTemplateClass()`：
```js
  window.addEventListener("kaizen:photos-changed",()=>{ applyTemplateClass(); renderDocument(); });
```

- [ ] **Step 4: 驗證語法與樣式**

Run: `node --check v4/js/main.js`、`node --check v4/js/templates/safety/index.js`
Expected: 兩者皆 exit 0。
重新讀取 `v4/css/safety.css`：括號平衡。

- [ ] **Step 5: Commit**

```bash
git add v4/css/safety.css v4/index.html v4/js/main.js
git commit -m "feat(v4): 工安模板警示黃黑樣式與切換"
```

---

### Task 3: 驗證與整合檢查

**Files:**
- （無程式碼變更，驗證用）

- [ ] **Step 1: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器）：
1. 「模板」頁籤顯示「工安」；點選 → `body` 有 `tpl-safety` class，文件變工安風（暖灰底、黑框、黃黑斜紋分隔帶）。
2. 危險等級輸入「高/中/低」→ 色塊分別顯示紅/黃/綠。
3. 改善前/後照片可上傳、拖曳、置中、縮放。
4. 切回「通用改善提案」→ 樣式恢復原本，工安 CSS 不影響。
5. 工安模板下點「列印 / 匯出 PDF」→ 輸出含黃黑配色與斜紋。
6. 切到簡報模板 → 正常。

- [ ] **Step 2: Commit（若無變更則略過）**

無程式碼變更，不需 commit。

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件四節（色彩/字體/斜紋→Task 2、結構→Task 1、整合→Task 2、驗收 1-5→Task 3）。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`body.tpl-safety` 在 Task 2（CSS）與 main.js（class 切換）一致；`.ga-*` class 在 Task 1（HTML）與 Task 2（CSS）一致；`data-level` 值「高/中/低」在 Task 1（產生）與 Task 2（樣式）一致。
