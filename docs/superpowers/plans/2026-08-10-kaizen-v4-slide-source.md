# V4 修復：一頁簡報以左側輸入為基準

日期：2026-08-10
狀態：Bug 報告 + Root cause 確認

## 問題

左側輸入新主題（例：騎車要戴安全帽）後，按「生成一頁簡報」仍以舊主題（例：用電安全）生成簡報文案。

## Root Cause

`generateSlide`（`v4/js/tab-narrative.js:81-82`）：
```js
syncFromDom();
const d={ title:data.title, before:data.before, after:data.after, benefits:data.benefits };
```
`syncFromDom()` 讀取**右側** `f-*` 欄位（document.js:16-21），`data.before/after` 為右側舊資料。`buildSlidePrompt`（prompts.js:94-96）把舊資料送給 AI，且規則未要求以內容為準 → 簡報沿用舊主題。

對照先前修復的 `generateAll` 已改以**左側** `conv-*` 為輸入基準，`generateSlide` 未同步修正，兩者不一致。

## 修法

### 1. `v4/js/tab-narrative.js`（`generateSlide`）

以左側 `sources()` 為主、右側為備援：
```js
syncFromDom();
const { srcBefore, srcAfter } = sources();
const d={ title:data.title, before:srcBefore||data.before, after:srcAfter||data.after, benefits:data.benefits };
```
（`sources()` 已只讀左側 `conv-*`；左側空時退回右側資料。）

### 2. `v4/js/prompts.js`（`buildSlidePrompt`）

新增規則：以改善前/後內容為主題依據：
```js
"規則：重點簡潔、適合長官閱讀。必須使用台灣繁體中文，嚴禁出現任何簡體中文字形（例如：写→寫、车→車、机→機、对→對、来→來）。判斷主題一律以「改善前」與「改善後」內容為主要依據，若「改善主題」與內容不符，請以內容為準，不要沿用舊主題。每項效益需包含一個百分比數字（如「減少停機 50%」），代表該面向的達成度（0-100），AI 自行判斷填入。輸出前請逐字檢查。",
```

## 不變

- `generateSlide` 後續流程（`data.slide`、切換 slide 模板、`renderDocument()`）不變。
- `generateAll` 行為不變。

## 驗收

1. 左側輸入「騎車要戴安全帽」→ 按「生成一頁簡報」→ 簡報標題/重點/效益/結語皆為安全帽主題，不再沿用「用電安全」。
2. 左側留空、右側有資料 → 簡報仍以右側資料生成（備援）。
3. `node --check` 通過。
