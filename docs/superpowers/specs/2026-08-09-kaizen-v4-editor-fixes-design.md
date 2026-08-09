# 改善提案生成器 V4：圖片編輯器修正 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 圖片編輯器（`v4/js/editor/editor.js`、`v4/js/editor/tools.js`）有四個問題需修正：

1. **文字大小無法調整**：`editor.js:69` 文字大小寫死為 `Math.max(14,width*6)`（跟隨線條寬度），沒有獨立控制。
2. **還原按鈕有時無反應**：`pushUndo()` 在每次變更**之後**才把目前 overlay 推入堆疊（`editor.js:59/69/72/93`），堆疊頂端永遠等於目前狀態 → 每次動作需按兩次還原才退一步。
3. **旋轉沒有作用**：`redraw()`（`editor.js:117-136`）只畫原圖，完全沒套用 `overlay.rotate`；只有 commit 的 `renderComposite()` 套用。編輯時點旋轉畫面不變。
4. **裁切沒有作用**：`applyCrop()`（`editor.js:173-180`）先設 `overlay.crop`，再以 `cropOverlay()` 的結果整個覆蓋 overlay，而 `cropOverlay()`（`tools.js:36-44`）回傳的物件**不含 crop 欄位** → crop 遺失，最終輸出也不會裁切；且 `redraw()` 不畫裁切區域，預覽看不出效果。

## 二、方案

### 1. 文字大小控制

- `editor.js` 新增模組層變數 `let fontSize=32;`。
- 工具列（`initEditor` 內建構的 toolbar，約第 28-36 行）在色票與復原之間新增字體大小控制：
  ```html
  <span class="sep"></span>
  <label class="font-size-wrap">字<output id="editorFontSizeVal">32</output>px</label>
  <input type="range" id="editorFontSize" min="12" max="96" step="1" value="32">
  ```
- 綁定 `input` 事件：更新 `fontSize` 與 `<output>` 顯示值。
- 文字工具（`editor.js:69`）改用 `size:fontSize`（移除 `Math.max(14,width*6)`）。
- `base.css` 的編輯器區段新增樣式：`.font-size-wrap`、`.editor-toolbar input[type=range]`。

### 2. 還原修正

原則：`pushUndo()` 必須在**變更前**呼叫，捕捉變更前狀態。

- **文字**（pointerdown）：先 `prompt`，若輸入非空 → `pushUndo()` 後再 `texts.push(...)`。
- **旋轉**（pointerdown）：`pushUndo()` 後再改 `overlay.rotate`。
- **繪圖類（rect/draw/arrow/crop）**：在 pointerdown 建立 `drawing` 之前 `pushUndo()`（捕捉互動前狀態），移除 pointerup 末尾的 `pushUndo()`。
- **清除**（toolClear）：`pushUndo()` 後再重置 overlay。

### 3. 旋轉修正

`redraw()` 需套用 `overlay.rotate`，且 `toImg()` 做反向旋轉座標轉換：

- `redraw()`：
  ```js
  const rot=((editing.overlay.rotate||0)%360);
  const rot90=rot%180===90;
  const crop=editing.overlay.crop;
  const iw=crop?crop.w:editing.img.width, ih=crop?crop.h:editing.img.height;
  const s=editing.scale;
  const cw=rot90?ih*s:iw*s, ch=rot90?iw*s:ih*s;
  if(c.width!==Math.round(cw)||c.height!==Math.round(ch)){ c.width=Math.round(cw); c.height=Math.round(ch); }
  ctx.clearRect(0,0,c.width,c.height);
  ctx.save();
  ctx.translate(c.width/2,c.height/2);
  ctx.rotate(rot*Math.PI/180);
  ctx.drawImage(editing.img, crop?crop.x:0, crop?crop.y:0, iw, ih, -iw*s/2, -ih*s/2, iw*s, ih*s);
  ctx.scale(s,s);
  ctx.translate(-iw/2,-ih/2);
  drawOverlay(ctx, editing.overlay);
  /* 預覽 d（座標在影像座標系）沿用，於縮放/平移後的座標空間繪製 */
  ctx.restore();
  ```
- `toImg()`（`editor.js:111-114`）改為：取畫布中心為原點 → 反向旋轉（90/180/270）→ 除以 scale → 加上目前畫面（含裁切）的半寬高：
  ```js
  function toImg(e){
    const c=$("editorCanvas"), r=c.getBoundingClientRect();
    const rot=((editing.overlay.rotate||0)%360);
    const crop=editing.overlay.crop;
    const iw=crop?crop.w:editing.img.width, ih=crop?crop.h:editing.img.height;
    let x=e.clientX-r.left - c.width/2;
    let y=e.clientY-r.top - c.height/2;
    if(rot===90){ const t=x; x=y; y=-t; }
    else if(rot===180){ x=-x; y=-y; }
    else if(rot===270){ const t=x; x=-y; y=t; }
    return { x:x/editing.scale + iw/2, y:y/editing.scale + ih/2 };
  }
  ```
- `openEditor`：畫布尺寸改由 `redraw()` 依 rotate+crop+scale 決定，`openEditor` 只依「旋轉後的畫面尺寸」計算 `editing.scale`（`fw/fh` 依 rot90 與 crop 計算），不再手動設 `c.width/height`。

### 4. 裁切修正

- `applyCrop()`（`editor.js:173-180`）改為**保留 crop 絕對座標**：
  ```js
  function applyCrop(r){
    if(!r||r.w<10||r.h<10) return;
    const base=editing.overlay.crop;
    const bx=base?base.x:0, by=base?base.y:0;
    const x=Math.max(0,Math.round(r.x)), y=Math.max(0,Math.round(r.y));
    const w=Math.min((base?base.w:editing.img.width)-x, Math.round(r.w));
    const h=Math.min((base?base.h:editing.img.height)-y, Math.round(r.h));
    if(w<10||h<10) return;
    const shifted=cropOverlay(editing.overlay, {x,y,w,h});
    shifted.crop={ x:bx+x, y:by+y, w, h };   // 絕對座標，供 renderComposite 裁切影像來源
    editing.overlay=shifted;
    redraw();
  }
  ```
- `cropOverlay()`（`tools.js:36-44`）需**保留 crop 欄位**（防再裁切時遺失）：回傳物件補 `crop:overlay.crop`。
- `drawOverlay()`（`tools.js:29-33`）的 crop 外框改以「目前畫面座標」繪製：`ctx.strokeRect(0,0,overlay.crop.w,overlay.crop.h)`（畫出整張裁切後畫面邊界）。
- `redraw()` 只畫 `overlay.crop` 指定區域（見方案 3），與 `renderComposite` 一致。
- `renderComposite()`（`editor.js:181-199`）不需改動（已正確處理 crop + rotate），現在 crop 保留後即會真正裁切影像。

## 三、不變項目

- 編輯工具列結構、色票、線寬、復原堆疊上限（50）、完成／取消、`kaizen:photos-changed`、`persistImages()` 流程。
- `renderComposite()` 邏輯。
- 照片縮放（`dispW/dispH`）、A4 方向等與編輯器無關的功能。

## 四、驗收標準

1. 文字工具可用字體大小滑桿（12–96px）設定文字大小，加入的文字以此大小顯示。
2. 每次繪圖動作（文字／框線／塗鴉／箭頭／旋轉／裁切／清除）按一次「還原」即退一步，連續按可依序回溯。
3. 點「旋轉」後畫布立即顯示旋轉效果，旋轉後繼續繪製座標正確；完成後輸出為旋轉後影像。
4. 拖曳裁切框後畫面立即只剩裁切區域（放大至畫布），既有疊加物件位置正確；完成後輸出為裁切後影像。
5. 旋轉與裁切組合使用時座標正確，完成／取消運作正常。
