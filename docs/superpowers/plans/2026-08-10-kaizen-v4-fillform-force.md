# V4 修復：自動填寫後右側版面保留舊資料

日期：2026-08-10
狀態：已與使用者確認（Bug 報告）

## 問題

點「點我 · 自動填寫＋正式措辭」（`generateAll`）後，左側 `conv-before/conv-after`（正式措辭）更新為新的 AI 優化詞語，但右側文件欄位（`f-before/f-after/f-benefit-*`）仍保留上一筆舊資料。

## Root Cause

`fillForm`（`v4/js/document.js:50`）的覆寫守衛：
```js
if(state.override || !el.value.trim()) el.value=v;
```
右側欄位已有內容時跳過不寫。而 `state.override` 預設 `false`（`store.js:17`）且**無任何 UI 開關**，等於右側永遠不會被新 AI 結果覆寫。左側 `conv-*` 卻是無條件覆寫（`tab-narrative.js:41-42`），造成左右不一致。

## 修法

`fillForm` 增加 `force` 參數；`generateAll` 以 `force=true` 呼叫，使「自動填寫」按鈕對右側與左側一致地強制覆寫（保留其他呼叫點／既有 `override` 設定的語意）。

### `v4/js/document.js`（`fillForm`）
```js
export function fillForm(obj, force){
  ...
    if(force || state.override || !el.value.trim()) el.value=v;
  ...
}
```

### `v4/js/tab-narrative.js`（`generateAll`）
```js
fillForm(results[0], true);
```

## 不變

- `state.override` 設定語意保留（設為 `true` 時仍全域強制）。
- 其他呼叫點（無）不影響。
- 左側 `conv-*` 行為不變。

## 驗收

1. 有舊資料的欄位再按「自動填寫＋正式措辭」→ 右側 `f-before/f-after/效益` 更新為新 AI 詞語，且左側同步。
2. 初次生成（空欄位）行為不變。
3. `node --check` 通過。
