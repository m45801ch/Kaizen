# V4 圖片編輯器視窗放大 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 加大圖片編輯器模態框至接近全螢幕，並讓圖片自動放大填滿可用空間（超出可捲動），提升視覺編輯體驗。

**Architecture:** 改 CSS（`.editor-card` 加大、`.editor-canvas` 移除 max 限制並 `margin:auto`）＋改 `openEditor` 的縮放計算（上限改為 4 倍、填滿可用空間）。繪製座標轉換以 `getBoundingClientRect` 計算，捲動後仍正確，不需改動。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/css/base.css`、`v4/js/editor/editor.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 縮放規則：`s = Math.min(MAX, maxW/img.width, maxH/img.height)`，`MAX = 4`（小圖最多放大 4 倍）；`s ≤ 0` 時退回 1（`s` 需宣告為 `let`）。
- 編輯工具（框線／塗鴉／箭頭／文字／裁剪／旋轉）、疊加層、復原、完成／取消、列印合成邏輯**完全不動**。
- 檔案編碼 UTF-8；不得加入無關程式碼；不得改動其他既有功能。

---

### Task 1: 編輯器視窗與畫布 CSS 放大

**Files:**
- Modify: `v4/css/base.css`（`.editor-card`、`.editor-canvas`）

**Interfaces:**
- Consumes: `.editor-modal`（`position:fixed;inset:0`）、`.editor-canvas-wrap`（`flex:1;overflow:auto`）。
- Produces: 模態框接近全螢幕；畫布以實際尺寸顯示、過小時置中、過大時捲動。

- [ ] **Step 1: 修改 `.editor-card`**

Modify `v4/css/base.css`：將目前的 `.editor-card` 規則（第 130 行）替換為：

```css
.editor-card{background:var(--surface);border-radius:14px;width:min(1200px,98vw);height:min(94vh);display:flex;flex-direction:column;overflow:hidden;box-shadow:var(--shadow-md)}
```

- [ ] **Step 2: 修改 `.editor-canvas`**

Modify `v4/css/base.css`：將目前的 `.editor-canvas` 規則（第 145 行）替換為：

```css
.editor-canvas{background:#fff;box-shadow:var(--shadow-md);cursor:crosshair;margin:auto}
```

- [ ] **Step 3: 驗證 CSS 語法**

重新讀取 `v4/css/base.css` 的第 128-148 行。
Expected: `.editor-modal`、`.editor-card`、`.editor-toolbar`、`.editor-canvas-wrap`、`.editor-canvas` 五條規則括號平衡、無殘留 `max-width/max-height:100%`。

- [ ] **Step 4: Commit**

```bash
git add v4/css/base.css
git commit -m "feat(v4): 編輯器視窗加大並讓畫布填滿可用空間"
```

---

### Task 2: 編輯器縮放計算改為填滿可用空間

**Files:**
- Modify: `v4/js/editor/editor.js`（`openEditor` 內縮放計算）

**Interfaces:**
- Consumes: `editing.img.width/height`、`#editorCanvasWrap` 的 `clientWidth/clientHeight`。
- Produces: `editing.scale = Math.min(4, maxW/img.width, maxH/img.height)`（≤0 時為 1）；畫布寬高 `img.width*s × img.height*s`（旋轉 90° 時互換），與現行一致。

- [ ] **Step 1: 修改 `openEditor` 縮放計算**

Modify `v4/js/editor/editor.js`：將目前的縮放計算（第 149-153 行）：

```js
    const maxW=(wrap?wrap.clientWidth:760)-40;
    const maxH=(wrap?wrap.clientHeight:560)-40;
    const s=Math.min(1,maxW/img.width,maxH/img.height);
```

替換為：

```js
    const maxW=(wrap?wrap.clientWidth:1200)-40;
    const maxH=(wrap?wrap.clientHeight:760)-40;
    const MAX=4;
    let s=Math.min(MAX,maxW/img.width,maxH/img.height);
    if(s<=0) s=1;
```

（其餘第 152 行以下 `editing.scale=s; c.width=img.width*s; ...` 保持不變。）

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 3: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器），上傳照片後點「✎」開啟編輯器：
1. 視窗接近全螢幕（寬 ~98vw、高 ~94vh）。
2. 小圖（如 300px 寬）放大至填滿可用空間；大圖縮小適配。
3. 圖片大於視窗時畫布區可捲動，框線／裁剪座標正確。
4. 完成／取消、旋轉 90° 後座標正常。

- [ ] **Step 4: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 編輯器縮放改為填滿可用空間（上限 4 倍）"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（CSS→Task 1、JS→Task 2）、驗收標準 1-3 對應 Task 2 Step 3 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`MAX=4`、`let s`（Task 2）與 spec 一致；`editing.scale`、畫布寬高設定維持原語義；CSS class 名 `.editor-card/.editor-canvas` 在 Task 1 與既有 HTML（`editor.js` 建構）一致。
