# 改善提案生成器 V4：效益欄位強調詞變色（contenteditable）設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

通用（generic）、工安（safety）、品質（quality）三個模板的「3 預期效益」下方三個欄位（`f-benefit-1/2/3`）目前是 `<textarea>`，只能顯示純文字，`**關鍵詞**` 不會變紅粗體。本設計將這三個欄位改為可編輯的 contenteditable div：`**詞**` 顯示為紅色粗體、欄位仍可直接編輯、編輯後強調標記（`**`）保留。「預期效益」標題本身不變色。簡報（slide）模板不在本範圍。

## 二、資料與轉換

- 效益資料以**含 `**` 的純文字**儲存於 `data.benefits[i]`（如「提升設備**維修效率**」）。
- **渲染方向**：`**x**` → `<b class="kw">x</b>`（與 `analysis.js` 的 `escEmphasis` 同邏輯）。
- **儲存方向**（編輯後寫回）：`<b class="kw">x</b>` → `**x**`，再存 `data.benefits[i]`（保留強調標記，避免 textContent 直接讀取時星號遺失）。

## 三、方案

### 1. 共用強調函式（`v4/js/analysis.js` 或新位置）

將 `analysis.js` 的 `escEmphasis`（現為私有）改為 `export`；並新增反向函式：
```js
export function escEmphasis(s){
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\*\*(.+?)\*\*/g,'<b class="kw">$1</b>');
}
export function unEmphasis(html){
  return String(html).replace(/<b class="kw">([\s\S]*?)<\/b>/g,"**$1**");
}
```
（`unEmphasis` 於讀取 contenteditable 的 innerHTML 時使用。）

### 2. `v4/js/templates/shared.js`（generic + quality 共用 `benefitBox`）

`benefitBox`（第 49-63 行）的效益欄位由 `<textarea>` 改為 `<div>`：
```js
'<div class="benefit-edit editable" id="'+id+'" contenteditable="true" data-benefit="'+id+'" placeholder="…">'+escEmphasis(v)+"</div>"+
```
- 保留 `id="f-benefit-N"`（既有 `bindDocument`/`syncFromDom`/`fillForm`/reset 相依）。
- 新增 `escEmphasis` import（自 `../analysis.js`）。

### 3. `v4/js/templates/safety/index.js`（`gaBenefitBox`）

同樣將 `f-benefit-1/2/3` 由 `<textarea>` 改為 `<div contenteditable>` + `escEmphasis(val)`，並 import `escEmphasis`。

### 4. `v4/js/document.js`

- `syncFromDom`（第 20-22 行）：`data.benefits[i] = $(...)?.textContent` 改為讀 innerHTML 再 `unEmphasis`：
  ```js
  data.benefits[0] = $("f-benefit-1") ? unEmphasis($("f-benefit-1").innerHTML) : "";
  ```
  （其餘 title/before/after 維持 `.value`，因仍是 input/textarea。）
- `fillForm`（第 46-53 行）：`map` 含 benefit1-3 → 對應 `f-benefit-N`。改為：若目標是 div（有 `data-benefit`），設 `innerHTML = escEmphasis(v)`；否則維持 `.value`。且 `autoResize` 僅對 textarea 作用（`autoResize` 已檢查 `tagName!=="TEXTAREA"` return，div 自動跳過，安全）。
- `bindDocument`（第 160-170 行 FORM input 綁定）：`f-benefit-N` 的 input 處理已包含在通用 `["f-title",...,"f-benefit-1",...]` 清單中，但清單中其他仍是 input/textarea。需對效益 div 的 input 事件改寫：觸發時 `unEmphasis(el.innerHTML)` 寫回 data 並 `saveForm()`。建議分離：效益 div 另綁定 input（或共用 handler 內判斷 `el.contentEditable==="true"`）。
- import `escEmphasis`、`unEmphasis`（自 `../analysis.js`）。

### 5. `v4/js/main.js`

reset（第 92 行）：`$("f-benefit-N").value=""` 改為 `$("f-benefit-N").innerHTML=""`。

### 6. CSS

新增（`v4/css/base.css` 或 `layout.css`）：
```css
.benefit-edit .kw{color:var(--danger);font-weight:700}
.benefit-edit{white-space:pre-wrap}
```
（`--danger` 為既有變數，與 `layout.css:161` 的 `.al-text .kw` 一致。）

## 四、不變項目

- 效益資料模型（`data.benefits` 三欄字串）不變。
- 「預期效益」標題不變色。
- 簡報模板（slide）效益標籤不在此範圍。
- 其他欄位（title/before/after）維持原控件。

## 五、驗收標準

1. 通用/工安/品質三模板，效益欄位輸入 `提升設備**維修效率**` → 顯示「維修效率」紅色粗體。
2. 效益欄位可直接編輯；編輯後 `data.benefits[i]` 仍含 `**` 強調標記。
3. 重新渲染（切模板/重開）後強調仍保留。
4. `**` 詞語不變色（無 `**` 標記）時正常顯示。
5. 列印/PDF 輸出含紅色粗體強調。
