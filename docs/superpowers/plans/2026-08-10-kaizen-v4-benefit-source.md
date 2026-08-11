# V4 修復：預期效益隨新主題更新

日期：2026-08-10
狀態：Bug 報告 + Root cause 確認

## 問題

按「自動填寫＋正式措辭」後，「預期效益」下方三個欄位一直保留舊主題的效益，不隨左側新輸入的改善前/後內容更新。

## Root Cause

`generateAll`（`v4/js/tab-narrative.js:23`）：
```js
const d={ title:data.title, before:srcBefore, after:srcAfter, benefits:data.benefits };
```
`benefits` 取右側 `f-benefit-*` 欄位（`data.benefits`，document.js:20-22），為**舊資料**。`buildPrompt`（prompts.js:13-15）把舊效益列為「使用者提供的資料」，加上規則 8「若使用者已提供正式內容，請參考並優化」→ AI 保留舊效益。

對照 title/before/after：title 已標「僅供參考」且規則 7 要求以內容為準；before/after 已改取左側 `sources()`。唯效益未同步修正。

## 修法

`v4/js/prompts.js` `buildPrompt`：

1. 效益 label 標「（僅供參考）」：
```js
benefit1:"第一項預期效益（僅供參考）", benefit2:"第二項預期效益（僅供參考）", benefit3:"第三項預期效益（僅供參考）"
```
2. 新增規則（插入規則 7 之後、原 8 改 9、原 9 改 10）：
```js
"8. 預期效益（benefit1/2/3）一律以「改善前（before）」與「改善後（after）」的內容為主要依據重新擬定，不要沿用與新內容無關的舊效益。",
"9. 若使用者已提供正式內容，請參考並優化，不要重複編造或刪除其核心重點。",
"10. 只回傳 JSON 物件，不要加任何額外文字、markdown 標記或註解。"
```

## 不變

- 左側 `conv-*`、右側 `f-*` 輸入機制不變；使用者手動輸入的效益在下次 AI 生成時會被新規則覆寫（依左側內容重新擬定），符合「AI 只負責填寫右側」設計。

## 驗收

1. 左側輸入新主題（例：騎車戴安全帽）→ 按「自動填寫＋正式措辭」→ 預期效益更新為安全帽相關效益，不再保留舊主題效益。
2. `node --check v4/js/prompts.js` 通過。
3. prompt 輸出含新規則 8（效益以內容為準）、編號連續。
