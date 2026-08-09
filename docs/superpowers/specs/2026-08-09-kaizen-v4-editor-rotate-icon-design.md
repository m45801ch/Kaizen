# 改善提案生成器 V4：編輯器旋轉互動與工具列圖示 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 圖片編輯器有兩項 UX 問題：

1. **旋轉「點按鈕不會轉，要再點圖」**：目前旋轉按鈕（`data-tool="rotate"`）只是「選取工具」，必須再點圖像本身才旋轉 90°（提示「點擊旋轉 90°」）。使用者期望**點工具列旋轉按鈕立即旋轉 90°**（像復原／清除那樣的動作按鈕）。
2. **工具列圖示難懂**：現行圖示太抽象（例如塗鴉像「M」、文字是多條橫線看不出是文字）。使用者希望換成更明確的圖示，例如文字就是一個「T」、塗鴉是一支筆。已選定 **Lucide** 圖示包（與現有 24px viewBox + `stroke="currentColor"` 描邊風格一致，ISC 開源授權，取自 `allsvgicons.com`）。

## 二、方案

### 1. 旋轉改為「點按鈕立即旋轉 90°」

- 新增模組層函式 `rotateImage()`：
  ```js
  function rotateImage(){
    if(!editing) return;
    pushUndo();
    editing.overlay.rotate=((editing.overlay.rotate||0)+90)%360;
    redraw();
  }
  ```
- 工具列 `[data-tool]` 點擊處理：當 `b.dataset.tool==="rotate"` 時呼叫 `rotateImage()` 並 `return`（不切換 active tool、不更新 hint）。
- 移除 canvas `pointerdown` 的 `if(tool==="rotate"){...}` 分支（不再需要「點圖旋轉」路徑）。
- `updateHint()` 的 hints 物件移除 `rotate` 鍵（旋轉不再是可選工具）。

### 2. 工具列圖示換成 Lucide

現行 `TOOLS` 陣列（`editor.js:11-18`）的圖示 path 替換為 Lucide 對應：

| 工具 id | 新 path（Lucide） |
|---------|-------------------|
| rect | `'<rect x="3" y="3" width="18" height="18" rx="2"/>'` |
| draw | `'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4"/>'`（pencil，一支筆） |
| arrow | `'<path d="M5 12h14m-7-7l7 7l-7 7"/>'`（水平箭頭） |
| text | `'<path d="M12 4v16M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M9 20h6"/>'`（type，一個 T 字） |
| crop | `'<g><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></g>'` |
| rotate | `'<g><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></g>'` |

`svgIcon()` 已輸出 `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">…</svg>`，與 Lucide 的 viewBox／描邊屬性相容，不需改動 `svgIcon`。

## 三、不變項目

- 旋轉邏輯本身（`redraw()` 套用 `overlay.rotate`、`toImg()` 反向座標）不動。
- 其他工具（框線／塗鴉／箭頭／文字／裁剪）的行為、還原、完成／取消、`renderComposite()` 不動。
- 工具列其餘元素（色票、字體滑桿、復原、清除）不動。

## 四、驗收標準

1. 點工具列「旋轉」按鈕 → 圖像立即旋轉 90°；連續點連續轉；每轉一次可按還原退一步。
2. 工具列六個圖示顯示清楚：框線＝方形框、塗鴉＝一支筆、箭頭＝水平箭頭、文字＝T 字、裁剪＝裁切符號、旋轉＝旋轉符號。
3. 其他工具行為不受影響。
