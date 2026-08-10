# V4 修復：自動填寫只以左側輸入為基準

日期：2026-08-10
狀態：已與使用者確認（Bug 報告）

## 問題

在左側 `conv-before/conv-after`（正式措辭欄位）輸入改善前/改善後後按「自動填寫＋正式措辭」（`generateAll`）。因右側 `f-*` 欄位常留有舊資料，且 `state.editSide` 會因 UI 互動被改為 `"right"`，導致 AI 無法判斷以哪一側為基準；再次點擊時 AI 以**右側舊資料**為基準去優化，並覆蓋左側新資料 — 錯誤。

## 需求（使用者確認）

1. AI 自動填寫＋措辭**只以左側使用者輸入**（`conv-before`/`conv-after`）為依據來自動優化。
2. 優化完成後，**右側**（`f-before`/`f-after` 等）同步更新為新對策內容。
3. AI **不判斷右側資料**，只負責填寫右側。
4. AI 填寫後，右側欄位維持可由使用者自行修改。

## Root Cause

`v4/js/tab-narrative.js` 的 `sources()`（第 14-22 行）依 `state.editSide.before/after` 決定從左側或右側取輸入基準：

```js
function sources(){
  const srcBefore = state.editSide.before==="left"
    ? ($("conv-before").value.trim()||$("f-before").value.trim())
    : ($("f-before").value.trim()||$("conv-before").value.trim());
  const srcAfter = state.editSide.after==="left"
    ? ($("conv-after").value.trim()||$("f-after").value.trim())
    : ($("f-after").value.trim()||$("conv-after").value.trim());
  return { srcBefore, srcAfter };
}
```

`state.editSide` 非使用者「指定基準」的語意，而是「最近編輯側」的 UI 追蹤（document.js:163/177、tab-narrative.js:128/143-145），會因點擊預覽→失焦變成 `"right"`。因此基準選擇不可靠。

## 修法

### `v4/js/tab-narrative.js`

1. `sources()` 一律只讀**左側**（`conv-before`/`conv-after`），不再參考 `state.editSide` 與右側：
```js
function sources(){
  return { srcBefore: $("conv-before").value.trim(), srcAfter: $("conv-after").value.trim() };
}
```
2. `generateAll` 錯誤訊息（第 28 行）改為提示左側：
```js
if(!srcBefore && !srcAfter){ status("error","請先於左側「正式措辭描述」欄位輸入改善前或改善後的內容。"); return; }
```

### `v4/index.html`（提示文字，選用）

第 47 行 hint 改為：「於左側正式措辭欄位輸入改善前／後內容，AI 會自動優化並填寫右側表格；右側可直接修改。」

## 不變

- 右側 `f-*` 仍可由使用者直接輸入／修改（既有 input 監聽與 editSide 顯示邏輯不變）。
- `fillForm(results[0], true)`（前次修復）已確保右側被新 AI 結果覆寫 — 本修復與其互補。
- 照片視覺分析（`analyzePhotos`）直接填右側，不受影響。

## 驗收

1. 左側輸入新資料、右側留舊資料 → 按「自動填寫＋正式措辭」→ AI 以左側新資料為基準，右側更新為新對策。
2. 再次點擊（右側已是 AI 新資料、左側仍為使用者輸入）→ 仍以左側為基準，不再用右側覆寫左側。
3. 左側留空、右側有資料 → 提示「請先於左側輸入」，不呼叫 AI。
4. `node --check` 通過。
