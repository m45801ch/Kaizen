# V4 修復：自動填寫後右側版面未同步更新

日期：2026-08-10
狀態：Bug 報告 + 整合測試確認

## 問題

左側 `conv-before/conv-after`（正式措辭欄位）輸入改善前/後，AI 自動填寫＋正式措辭（`generateAll`）完成後，右側 `#doc` 版面（改善前/後分析、`具體現象/潛在風險/管理缺失` 列點等）仍顯示**上一筆舊資料**，未隨新主題更新。

## Root Cause

`generateAll`（`v4/js/tab-narrative.js`）完成 `fillForm(results[0], true)` 後**沒有呼叫 `renderDocument()`**。右側 `#doc` 的 HTML 是頁面載入／切換模板時的舊渲染，未以更新後的 `data` 重繪。

對照 `generateSlide`（tab-narrative.js:92）有呼叫 `renderDocument()`，兩者不一致。

整合測試證明：
- `fillForm(ai, true)` 後：`f-before` 文字框與 `analysis-preview` 有更新，但 `doc.innerHTML` 仍為舊內容。
- 補呼叫 `renderDocument()` 後：`doc.innerHTML` 含新資料、舊資料消失。

## 修法

`v4/js/tab-narrative.js` 的 `generateAll`，在 `fillForm` 與左側 conv 更新之後，補上：
```js
renderDocument();
renderAllAnalysis();
```
- `renderDocument()`：以最新 `data` 重繪右側 `#doc`。
- `renderAllAnalysis()`：重繪後重新套用分析列點預覽顯示狀態（preview/textarea 切換）。

## 不變

- `fillForm`（含 force 覆寫）行為不變。
- `generateSlide` 既有 `renderDocument()` 不變。
- 其他資料流不變。

## 驗收

1. 左側輸入新改善前/後 → 按「自動填寫＋正式措辭」→ 右側 `#doc` 改善前/後分析列點更新為新主題內容。
2. 右側分析預覽（preview）正常顯示，不退回純文字框。
3. `node --check` 通過。
4. 整合測試：generateAll 完成後 `doc.innerHTML` 含新資料、不含舊資料。
