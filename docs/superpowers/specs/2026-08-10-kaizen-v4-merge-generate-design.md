# 改善提案生成器 V4：整合自動填寫＋正式措辭與一頁簡報生成 設計文件

日期：2026-08-10
狀態：已與使用者確認

## 一、背景與目標

目前「點我·自動填寫＋正式措辭」（`generateAll`）只填正式表格內容與措辭；「生成一頁簡報」（`generateSlide`）是獨立按鈕，且只切到簡報模板時才有簡報內容。使用者希望：
1. **整合**：按「點我·自動填寫＋正式措辭」一次完成三件事 — 正式表格內容、正式措辭、一頁簡報內容（`data.slide`）。
2. **不切換模板**：生成後停在目前模板。
3. **移除**獨立「生成一頁簡報」按鈕。
4. **四模板共用同一份 data**：通用/工安/品質（title/before/after/benefits）與簡報（data.slide）共用，切換模板即顯示相同內容。

## 二、方案

### 1. `generateAll` 整合簡報生成（`v4/js/tab-narrative.js`）

現 `generateAll`（第 18-48 行）平行呼叫 `buildPrompt`＋`buildColloquialPrompt`。改為**三個並行呼叫**，新增 `buildSlidePrompt`：

```js
const results=await Promise.all([
  callForProvider(state.provider,key,model,buildPrompt(d)),
  callForProvider(state.provider,key,model,buildColloquialPrompt(srcBefore,srcAfter)),
  callForProvider(state.provider,key,model,buildSlidePrompt(d))
]);
fillForm(results[0], true);
if(results[1].before_conv!==undefined) $("conv-before").value=String(results[1].before_conv);
if(results[1].after_conv!==undefined) $("conv-after").value=String(results[1].after_conv);
CONV_IDS.forEach(id=>autoResize($(id)));
const slideObj=results[2];
data.slide={ slideTitle:slideObj.slideTitle||d.title||"改善提案", keyPoints:Array.isArray(slideObj.keyPoints)?slideObj.keyPoints:[], benefits:Array.isArray(slideObj.benefits)?slideObj.benefits:[], conclusion:slideObj.conclusion||"" };
saveForm();
renderDocument();
renderAllAnalysis();
```

- `d` 沿用第 23 行 `{ title:data.title, before:srcBefore, after:srcAfter, benefits:["","",""] }`（簡報 prompt 以左側輸入為依據）。
- **不切模板、不切橫向**：`state.template`/`localStorage`/`applyOrientation` 均不動，停在目前模板。
- 狀態訊息改為「已同步完成正式表格、正式措辭與一頁簡報。」。

### 2. 移除獨立簡報按鈕

- `v4/index.html`：移除 `slideBtn`（生成一頁簡報）按鈕。
- `v4/js/tab-narrative.js`：
  - `initNarrative` 中移除 `$("slideBtn").addEventListener("click",generateSlide)`。
  - 移除 `generateSlide` 函式（其 `data.slide` 建構邏輯併入 `generateAll`）。

### 3. 跨模板套用

- 通用/工安/品質模板共用 `data`（title/before/after/benefits）— 已如此，切換模板即顯示。
- 簡報 `data.slide` 由整合後的自動填寫生成並 `saveForm()` → 切到簡報模板即顯示。
- `renderDocument`/模板切換邏輯不需改動。

### 4. 不變

- `buildPrompt`/`buildSlidePrompt`/`buildColloquialPrompt` 內容規則不變。
- `fillForm`、照片機制、簡報文字編輯/拖拽/縮放機制不動。
- 其他模板 render 不變。

## 三、驗收標準

1. 按「點我·自動填寫＋正式措辭」→ 通用/工安/品質模板的正式表格內容＋左側正式措辭＋一頁簡報內容（data.slide）全部生成。
2. 生成後停在目前模板，不自動切到簡報。
3. 「生成一頁簡報」按鈕已移除。
4. 切到任何模板（含簡報）都顯示相同內容（共用 data）。
5. `node --check` 通過。
