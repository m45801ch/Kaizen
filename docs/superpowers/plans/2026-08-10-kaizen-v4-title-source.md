# V4 修復：自動填寫以左側改善前/後內容為主題依據

日期：2026-08-10
狀態：Bug 報告 + Root cause 確認

## 問題

左側輸入新主題（例：騎車要戴安全帽）並 AI 填寫後，右側 `#doc` 仍以**舊改善主題**（例：用電安全）生成內容，未以左側新內容為準。

## Root Cause

`generateAll`（`v4/js/tab-narrative.js:23`）：
```js
const d={ title:data.title, before:srcBefore, after:srcAfter, benefits:data.benefits };
```
`data.title` 來自右側 `f-title`（`document.js:16`，舊標題「用電安全」）。`buildPrompt`（`prompts.js:10-17`）把 `d.title` 作為「提案標題：用電安全」權威輸入送給 AI，加上規則 7「若使用者已提供正式內容，請參考並優化」→ AI 錨定舊標題，忽略左側新內容。

## 修法

調整 `v4/js/prompts.js` 的 `buildPrompt`：

1. title 標籤改為「改善主題（僅供參考）」：
```js
title:"改善主題（僅供參考）"
```
2. 注意事項新增規則（主題以改善前/後內容為準）：
```js
"7. 判斷改善主題與內容，一律以「改善前（before）」與「改善後（after）」的描述內容為主要依據；若「改善主題」欄位與內容不符，請以內容為準，不要被舊的主題名稱誤導。"
```
3. 原規則 7（參考並優化）順延為 8，原規則 8 順延為 9：
```js
"8. 若使用者已提供正式內容，請參考並優化，不要重複編造或刪除其核心重點。",
"9. 只回傳 JSON 物件，不要加任何額外文字、markdown 標記或註解。"
```

## 不變

- `fillForm(results[0], true)` 已會覆寫右側 `f-title`（map 含 `title:"f-title"`，force 生效）→ AI 重新生成的標題會寫入右側。
- 其他 prompt（簡報、措辭、照片）不動。

## 驗收

1. 左側輸入「騎車要戴安全帽」→ 按「自動填寫＋正式措辭」→ 右側 `#doc` 改善前/後分析與改善主題更新為安全帽主題，不再是「用電安全」。
2. `node --check v4/js/prompts.js` 通過。
3. 既有自動填寫行為（右側重繪、左側同步）不受影響。
