# 改善提案生成器 V4：編輯器線寬滑桿與粗細預覽 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 圖片編輯器目前有 `width` 變數（預設 4），用於**框線、塗鴉、箭頭**三者的線寬，但**沒有 UI 可調整**。本設計新增一個「線寬」滑桿（1–30px），並在旁加入**粗細視覺預覽**（一小段該粗細的線段），讓使用者直觀了解目前粗細（不只靠數字）。

## 二、方案

修改 `v4/js/editor/editor.js` 與 `v4/css/base.css`（僅此兩檔）。

### 1. 工具列新增「線寬」控制（`editor.js`）

目前工具列已有字體滑桿（約第 34-35 行）：
```js
      '<label class="font-size-wrap">字<output id="editorFontSizeVal" for="editorFontSize">32</output>px</label>'+
      '<input type="range" id="editorFontSize" min="12" max="96" step="1" value="32">'+
```
在其後（同一個 `<span class="sep">` 之前）插入：
```js
      '<label class="font-size-wrap">粗<canvas id="editorWidthPrev" width="40" height="22"></canvas></label>'+
      '<input type="range" id="editorWidth" min="1" max="30" step="1" value="4">'+
```

- `#editorWidth`：range 1–30px，預設 4。
- `#editorWidthPrev`：40×22 的 canvas，即時繪製一條「目前粗細」的水平線段。

### 2. JS（`editor.js`）

- 模組層 `width` 變數沿用（`let tool="select", color="#EF4444", width=4, fontSize=32;`，第 8 行）。
- 新增 `drawWidthPrev()` 函式：在 `#editorWidthPrev` canvas 上 `clearRect` 後畫一條水平線（`ctx.lineWidth = width`、`strokeStyle = "#1E293B"`（text 色）、從 `(6, 11)` 到 `(34, 11)`），粗細即時反映 `width`。
- `initEditor` 內綁定：
  ```js
  const wRange=$("editorWidth"), wPrev=$("editorWidthPrev");
  function drawWidthPrev(){
    const c=wPrev.getContext("2d");
    c.clearRect(0,0,40,22);
    c.strokeStyle="#1E293B";
    c.lineCap="round";
    c.lineWidth=parseInt(wRange.value,10);
    c.beginPath(); c.moveTo(6,11); c.lineTo(34,11); c.stroke();
  }
  wRange.addEventListener("input",()=>{ width=parseInt(wRange.value,10); drawWidthPrev(); });
  drawWidthPrev();
  ```
  （`width` 為全域繪製變數，`strokes.push/rects.push/arrows.push` 已使用它，不需改動繪製邏輯。）
- 確認 `strokeStyle` 使用固定深色（text 色），避免與色票變色混淆，讓「粗細」本身清晰。

### 3. CSS（`base.css`）

在 `.editor-toolbar input[type=range]{...}` 規則後加入：
```css
.editor-toolbar #editorWidthPrev{vertical-align:middle}
```

## 三、不變項目

- 繪製邏輯（`strokes.push/rects.push/arrows.push` 使用 `width`）、其他工具（文字/裁剪/旋轉/選擇）、還原、完成/取消、`renderComposite` 輸出不動。
- 字體滑桿（12–96px）照常可用。

## 四、驗收標準

1. 工具列出現「線寬」滑桿（1–30px）與粗細預覽。
2. 拖滑桿時預覽即時更新，畫出的框線/塗鴉/箭頭以該粗細繪製。
3. 完成後輸出（縮圖/列印）粗細正確。
4. 字體滑桿、其他功能不受影響。
