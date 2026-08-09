# 改善提案生成器 V4：圖片編輯器「選擇/移動」工具 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 圖片編輯器目前繪製的疊加物件（文字、圖框、箭頭、塗鴉）在放置後**無法再編輯**：文字不能旋轉、圖框不能縮放、箭頭/塗鴉不能移動或改形狀。本設計新增一個**「選擇/移動」工具**，讓所有疊加物件都可選取與操作。

使用者決策：
- 新增「選擇」工具（游標圖示），點選物件後顯示控制把手。
- **全部疊加物件**都可操作。
- **最完整**：文字旋轉＋移動、圖框縮放＋移動、箭頭端點各自拖動、塗鴉逐點編輯。

## 二、方案

### 1. 新增「選擇」工具

- `TOOLS` 陣列最前面加入 `["select","選擇", 游標 SVG path]`，並將預設 active 工具改為 `select`（`TOOLS.map` 中 `id==="rect"` 的 active 判斷改為 `id==="select"`）。
- 游標圖示（Lucide `mouse-pointer`）：`'<path d="M4 3l7 18l2.5-6.5L20 14z"/>'`（外框造型，與現有 24px 描邊相容）。
- `updateHint()` 新增 `select:"點選物件後拖曳調整"`。
- 選擇工具下不產生新物件，只做選取/操作。

### 2. 資料模型擴充

- `texts[]` 每個物件新增 `angle`（度，順時針，預設 0）。既有資料無 `angle` 時視為 0（`t.angle||0`）。
- `rects[]`（`{x,y,w,h,color,width}`）、`arrows[]`（`{x1,y1,x2,y2,color,width}`）、`strokes[]`（`{points:[{x,y}],color,width}`）結構不變。

### 3. 選取狀態與操作

- 模組層變數：`let selected=null;`（`{ type:"text"|"rect"|"arrow"|"stroke", index }`）。
- **命中測試** `hitTest(p)`：依「由上而下」順序（texts → rects → strokes → arrows 的反向遍歷）回傳第一個命中的物件；門檻以螢幕距離計算（約 8px，除以 `editing.scale` 換算回畫面座標），避免大圖縮小後難點中。
- **操作**（pointerdown 時 `pushUndo()` 一次，pointerup 結束；一次還原退一步）：

| 物件 | 移動 | 縮放 | 旋轉 | 端點/逐點 |
|------|------|------|------|-----------|
| 文字 | 拖本體 | 無 | 上方旋轉把手（拖到任意角度） | — |
| 圖框 | 拖本體 | 8 個把手（四角＋四邊，調 x/y/w/h，最小 10px） | 無 | — |
| 箭頭 | 拖本體 | 無 | 無 | 兩端點各自可拖（改變 x1/y1 或 x2/y2） |
| 塗鴉 | 拖整條 | 無 | 無 | 每個點都可拖 |

- `redraw()` 在 `drawOverlay` 之後、`ctx.restore()` 之前繪製選取框與把手：
  - 通用：虛線選取框（對應物件 bounding box）。
  - 文字：上方中心一個圓點旋轉把手。
  - 圖框：四角＋四邊共 8 個小方塊把手。
  - 箭頭：兩端點各一個圓點把手。
  - 塗鴉：每個點一個小圓點把手。
- 把手與命中優先權：選取狀態存在時，先測把手（旋轉把手→縮放把手→端點/點把手→本體），再測其他物件。

### 4. 座標與繪製

- 所有操作座標用現有 `toImg(e)`（已處理整體 crop+rotate 反向轉換），物件活在「目前畫面座標系」。
- `drawOverlay`（`tools.js`）文字支援 `angle`：
  ```js
  (overlay.texts||[]).forEach(t=>{
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(((t.angle||0)*Math.PI/180));
    ctx.font=(t.bold?"700 ":"")+t.size+"px sans-serif";
    ctx.fillStyle=t.color; ctx.textBaseline="top";
    ctx.fillText(t.text, 0, 0);
    ctx.restore();
  });
  ```
- `renderComposite`（`editor.js`）輸出時文字同樣套用 `angle`（與 drawOverlay 相同方式）。
- `cropOverlay`（`tools.js`）平移文字座標時保留 `angle`（`{...t, x:t.x-crop.x, y:t.y-crop.y}`，`angle` 自動保留）。
- 命中測試的矩形判別：文字用 measureText 估 bounding box；圖框用 x/y/w/h；箭頭用點到線段距離；塗鴉用點到折線距離。

### 5. 不變項目

- 繪製工具（框線/塗鴉/箭頭/文字/裁剪）的行為、整體旋轉按鈕、還原、完成/取消、`renderComposite` 整體邏輯、`redraw`/`toImg` 的座標核心不動。
- 工具列其餘元素（色票、字體滑桿、復原、清除）不動。

## 三、資料流

- 操作後直接寫回 `editing.overlay` 對應物件欄位（`texts[i].angle`、`rects[i].x/y/w/h`、`arrows[i].x1/y1/x2/y2`、`strokes[i].points`）。
- 完成（`commit()`）時照舊寫入 `photo.overlay` 並 `persistImages()`；新增欄位（`angle`）隨物件整包存入 IndexedDB。

## 四、驗收標準

1. 「選擇」工具為預設啟用，點選任一疊加物件顯示選取框與對應把手。
2. 文字可拖動位置、拖旋轉把手到任意角度；輸出（完成後縮圖／列印）含旋轉。
3. 圖框可拖動位置、拖 8 個把手調整大小（最小 10px）。
4. 箭頭可拖動位置、拖兩端點改變方向。
5. 塗鴉可拖動整條、拖任一點編輯形狀。
6. 每項操作一次還原退一步；與整體旋轉/裁切組合後座標仍正確。
