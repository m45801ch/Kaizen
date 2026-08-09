# V4 編輯器線寬滑桿與粗細預覽 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在圖片編輯器工具列新增「線寬」滑桿（1–30px）與粗細視覺預覽，讓框線/塗鴉/箭頭可調整線寬。

**Architecture:** 工具列加入 `#editorWidth`（range 1–30）與 `#editorWidthPrev`（40×22 canvas，繪製目前粗細的線段）；`input` 事件更新既有 `width` 全域變數並重繪預覽；繪製邏輯沿用 `width`，不需改動。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/editor/editor.js`、`v4/css/base.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- `#editorWidth`：range 1–30px，預設 4；`input` 時 `width=parseInt(value,10)`。
- 預覽 canvas `#editorWidthPrev`（40×22）：`drawWidthPrev()` 繪製一條水平線段（`(6,11)→(34,11)`、`lineWidth=width`、`lineCap="round"`、`strokeStyle="#1E293B"`），初始化與每次 input 都呼叫。
- `width` 全域變數沿用（繪製邏輯不變）。
- 字體滑桿、其他功能不動；不得加入無關程式碼。

---

### Task 1: 線寬滑桿與粗細預覽

**Files:**
- Modify: `v4/js/editor/editor.js`（工具列 HTML、事件綁定）
- Modify: `v4/css/base.css`（`#editorWidthPrev` 對齊樣式）

**Interfaces:**
- Consumes: 模組層 `width`（預設 4）。
- Produces: `#editorWidth`（range 1–30）、`#editorWidthPrev`（canvas 40×22）；`input` 更新 `width` 並重繪預覽。

- [ ] **Step 1: 工具列加入線寬控制**

Modify `v4/js/editor/editor.js`：在字體滑桿（第 37-38 行）
```js
      '<label class="font-size-wrap">字<output id="editorFontSizeVal" for="editorFontSize">32</output>px</label>'+
      '<input type="range" id="editorFontSize" min="12" max="96" step="1" value="32">'+
```
之後、`'<span class="sep"></span>'`（第 39 行，復原鈕前的分隔線）之前插入：
```js
      '<label class="font-size-wrap">粗<canvas id="editorWidthPrev" width="40" height="22"></canvas></label>'+
      '<input type="range" id="editorWidth" min="1" max="30" step="1" value="4">'+
```

- [ ] **Step 2: 綁定線寬事件與預覽**

Modify `v4/js/editor/editor.js`：在字體滑桿綁定區塊（第 66-70 行）
```js
  const fsRange=$("editorFontSize"), fsVal=$("editorFontSizeVal");
  fsRange.addEventListener("input",()=>{
    fontSize=parseInt(fsRange.value,10);
    fsVal.textContent=fontSize;
  });
```
之後加入：
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

- [ ] **Step 3: base.css 加入預覽對齊樣式**

Modify `v4/css/base.css`：在 `.editor-toolbar input[type=range]{width:70px;accent-color:var(--primary);cursor:pointer}` 規則之後加入：
```css
.editor-toolbar #editorWidthPrev{vertical-align:middle}
```

- [ ] **Step 4: 驗證語法與樣式**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。
重新讀取 `v4/css/base.css` 編輯器區段：新規則括號平衡。

- [ ] **Step 5: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器），上傳照片後開編輯器：
1. 工具列字體滑桿旁出現「粗」＋ 40×22 預覽 canvas ＋線寬滑桿（1–30，預設 4）。
2. 拖線寬滑桿 → 預覽線段粗細即時變化。
3. 用框線/塗鴉/箭頭工具繪製 → 以目前線寬繪製（改滑桿後重繪更粗/更細）。
4. 點「完成」後縮圖粗細正確。
5. 字體滑桿照常運作。

- [ ] **Step 6: Commit**

```bash
git add v4/js/editor/editor.js v4/css/base.css
git commit -m "feat(v4): 編輯器線寬滑桿與粗細預覽"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（工具列控制→Step 1、JS/CSS→Step 2/3），驗收標準 1-4 對應 Step 5 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`#editorWidth`/`#editorWidthPrev` 在 Step 1（HTML）與 Step 2（JS 綁定）一致；`width` 全域變數沿用；`drawWidthPrev` 命名在 Step 2 內一致。
