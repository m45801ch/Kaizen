# 改善提案生成器 V4：工安模板危險等級＋預期效益重新設計 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

工安（safety）模板目前：
1. 危險等級欄位同時有「高/中/低」色塊 + 右側文字輸入框（`f-safety-level`），輸出時會有兩個等級重複、版面怪異；且 AI 生成不會判定等級。
2. 預期效益沿用 generic 的 `benefitBox`，配色與通用模板相同，缺乏工安辨識度。

本設計：
1. 危險等級改為 **AI 自動判定＋點選色塊切換**，移除文字輸入框。
2. 預期效益改為**工安風**（黃黑警示條＋黃/橙/紅三色圖示）。

## 二、危險等級欄位

### 資料流
- `buildPrompt`（prompts.js）加入 `safetyLevel` 欄位：要求 AI 依改善前風險判定「高/中/低」，只回傳其一。
- `fillForm`（document.js）：若 `obj.safetyLevel` 存在且為 高/中/低，寫入 `data.extra.safetyLevel`（需處理 safety 模板）。
- `syncFromDom`：移除 `f-safety-level` 讀取（欄位已移除）。

### 模板（safety/index.js render）
移除 `f-safety-level` 文字輸入框，改為三個可點選色塊按鈕：
```js
const level = (d.extra && d.extra.safetyLevel) || "";
const levels = ["高","中","低"];
const levelRow = '<div class="ga-level-row">'+
  '<span class="ga-level-label">危險等級</span>'+
  levels.map(l=>
    '<button type="button" class="ga-level-chip'+(level===l?" active":"")+'" data-level-set="'+l+'" title="設定危險等級 '+l+'">'+l+"</button>"
  ).join("")+
"</div>";
```

### document.js
- `bindDocument` click 委派新增 `[data-level-set]` 分支：點擊 → `data.extra.safetyLevel = 值`，`renderDocument()` + `saveForm()`。
- `fillForm` 加入 safetyLevel 寫入。
- `syncFromDom` 移除 `if(tpl.id==="safety") data.extra.safetyLevel = ...`（不再讀取已移除的欄位）。

### CSS（safety.css）
- 三個色塊統一高度（38px）、等寬；`.active` 黑框粗邊＋亮色填充；未選取灰底黑字；hover 微亮。
- 移除 `.ga-level-input` 樣式（欄位移除）。

## 三、預期效益工安風

### 模板（safety/index.js render）
新增 `gaBenefitBox(d)` 取代 generic `benefitBox`：
```js
function gaBenefitBox(d){
  const items=[
    ['fa-yellow','#F2B705', d.benefits[0]],
    ['fa-orange','#E8590C', d.benefits[1]],
    ['fa-red','#D63426', d.benefits[2]]
  ];
  return '<div class="ga-benefit-box">'+
    '<div class="ga-benefit-cap">預期效益</div>'+
    '<div class="ga-benefit-cols">'+items.map((it,idx)=>{
      const cls=it[0], color=it[1], val=it[2];
      const icons={ 'fa-yellow':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l10 18H2z"/><path d="M12 10v4m0 3h.01"/></svg>',
        'fa-orange':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"/><path d="M12 8v5m0 3h.01"/></svg>',
        'fa-red':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3 7 7 .6-5.4 4.8 1.7 7L12 18.3 5.7 21.4l1.7-7L2 9.6 9 9z"/></svg>' };
      return '<div class="ga-benefit-col '+cls+'"><div class="ga-benefit-icon">'+icons[cls]+"</div>"+
        '<textarea class="editable" id="f-benefit-'+(idx+1)+'" rows="1" placeholder="…">'+esc(val)+"</textarea>"+
      "</div>";
    }).join("")+"</div>"+
    '<div class="ga-stripe"></div>'+
  "</div>";
}
```
`render` 結尾改用 `gaBenefitBox(d)`。

### CSS（safety.css）
- `.ga-benefit-box`：黑框（3px）、黃色標題帶（`預期效益` 黑字黃底）、底部黃黑斜紋條。
- `.ga-benefit-col`：三欄，各欄頂部警示色條（黃/橙/紅），左側對應警示色圖示。
- `.ga-benefit-col .editable`：白底黑字。

## 四、不變項目

- 其他模板、資料結構（`benefits` 陣列、`safetyLevel`）、AI 其他欄位（title/before/after/benefit1-3）、列印機制不變。
- `f-benefit-1/2/3` id 保留（`syncFromDom`/`fillForm` 持續讀寫效益）。

## 五、驗收標準

1. 工安模板的危險等級欄顯示三個統一高度的色塊（高=紅、中=黃黑、低=綠），不再有文字輸入框。
2. 點選色塊 → 該等級高亮、`data.extra.safetyLevel` 更新、刷新保留。
3. AI 生成（自動填寫＋正式措辭）時，若 AI 回傳 `safetyLevel` → 對應色塊自動高亮。
4. 預期效益區為工安風：黃色標題帶、三欄各有黃/橙/紅警示色條與圖示、底部黃黑斜紋。
5. 其他模板與功能不受影響；列印輸出正常。
