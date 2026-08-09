# V4 照片自由縮放與 A4 直橫向 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 移植 V3 兩項功能到 V4：每張照片可拖曳把手自由調整寬高（不等比、記憶於瀏覽器），工具列可切換 A4 直向／橫向（預覽與列印同步）。

**Architecture:** 照片物件新增 `dispW/dispH` 欄位（IndexedDB 隨照片本體持久化），`shared.js` 渲染時套用 inline 寬高並加縮放把手，`document.js` 用 Pointer Events 實作拖曳；A4 方向用 `body.orient-landscape` class + 注入 `@page{size:A4 landscape}`，CSS 控制橫向版面。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架），IndexedDB（照片）、localStorage（A4 方向，沿用 `kai.gen.orient.v1`）。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 照片拖曳縮放：獨立調整寬度與高度（不等比），最小 40px，最大不超過照片區寬度；鬆開時 `persistImages()` 記憶。
- 照片無 `dispW/dispH` 時預設：寬 260px、高 `round(260 * h / w)`（最小 40px；`w`/`h` 為 0 時高亦為 260px）。
- 照片顯示完整不裁切（`object-fit:contain`），版面改為 flex-wrap（仿 V3），移除正方形裁切。
- A4 方向沿用 localStorage key `kai.gen.orient.v1`（`STORE.orient`，與 V3 相同）。
- 檔案編碼 UTF-8；不得加入註解以外的無關程式碼；不得改動其他既有功能。

---

### Task 1: 照片渲染加入 dispW/dispH 與縮放把手（shared.js）

**Files:**
- Modify: `v4/js/templates/shared.js`（`photoZone` 函式）

**Interfaces:**
- Consumes: 照片物件 `{ id, name, dataUrl, previewDataUrl, mime, side, w, h, overlay, dispW?, dispH? }`。
- Produces: `.photo-thumb` 帶 inline `width/height`（px）；每張含 `.resize-handle[data-resize=<id>]` 把手。

- [ ] **Step 1: 修改 `photoZone`**

Modify `v4/js/templates/shared.js`：將目前的 `photoZone` 函式（第 19-34 行）整體替換為：

```js
export function photoZone(side, photos){
  const list = photos[side]||[];
  let thumbs = list.map(p=>{
    const ratio = (p.w && p.h) ? p.h/p.w : 1;
    const w = p.dispW || 260;
    const h = p.dispH || Math.max(40, Math.round(260*ratio));
    return '<div class="photo-thumb" data-id="'+esc(p.id)+'" style="width:'+w+'px;height:'+h+'px">'+
      '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+esc(p.name||"照片")+'">'+
      '<button type="button" class="remove" data-remove="'+esc(p.id)+'" title="移除照片">✕</button>'+
      '<button type="button" class="edit-btn" data-edit="'+esc(p.id)+'" title="編輯照片">✎</button>'+
      '<span class="resize-handle" data-resize="'+esc(p.id)+'" title="調整尺寸"></span>'+
    "</div>";
  }).join("");
  return '<div class="photo-zone" id="photo-zone-'+side+'">'+
    '<div class="photo-grid" id="photo-grid-'+side+'">'+thumbs+"</div>"+
    '<div class="photo-empty" id="photo-empty-'+side+'"'+(list.length?' style="display:none"':"")+'>尚未上傳'+ (side==="before"?"改善前":"改善後") +"照片</div>"+
    '<button type="button" class="photo-add" id="photo-add-'+side+'">＋ 上傳照片（可多張）</button>'+
    '<input type="file" id="photo-input-'+side+'" accept="image/*" multiple hidden>'+
  "</div>";
}
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/templates/shared.js`
Expected: exit 0，無輸出。

- [ ] **Step 3: 手動檢查渲染結構**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器），上傳一張照片後以 DevTools 檢視 `.photo-thumb`。
Expected: `.photo-thumb` 有 `style="width:260px;height:…px"`（依照片比例），且含 `.resize-handle` 元素、`data-resize` 屬性。

- [ ] **Step 4: Commit**

```bash
git add v4/js/templates/shared.js
git commit -m "feat(v4): 照片渲染加入 dispW/dispH 與縮放把手"
```

---

### Task 2: 照片版面 CSS（flex-wrap、縮放把手、列印）

**Files:**
- Modify: `v4/css/layout.css`（`.photo-grid`、`.photo-thumb`、列印區塊）

**Interfaces:**
- Consumes: Task 1 產生的 `.photo-thumb[style=width/height]`、`.resize-handle`。
- Produces: 每張照片以 inline 寬高顯示（flex-wrap、不裁切），把手樣式，列印時把手隱藏。

- [ ] **Step 1: 修改螢幕樣式**

Modify `v4/css/layout.css`：將目前的 `.photo-grid`、`.photo-thumb`、`.photo-thumb img`（第 95-100 行）替換為：

```css
.photo-grid{display:flex;flex-wrap:wrap;gap:9px;align-items:flex-start}
.photo-thumb{
  position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--line);
  background:var(--surface);flex:0 0 auto;box-shadow:var(--shadow-sm);
}
.photo-thumb img{width:100%;height:100%;object-fit:contain;display:block}
.photo-thumb .resize-handle{
  position:absolute;right:0;bottom:0;width:16px;height:16px;cursor:se-resize;
  opacity:0;transition:opacity .15s;touch-action:none;
  border-right:3px solid var(--primary);border-bottom:3px solid var(--primary);
  border-bottom-right-radius:4px;
}
.photo-thumb:hover .resize-handle{opacity:.85}
```

並修改 `.photo-thumb .edit-btn`（第 106-110 行）：將 `bottom:6px` 改為 `bottom:32px`（讓出右下角給縮放把手）：

```css
.photo-thumb .edit-btn{
  position:absolute;bottom:32px;right:6px;width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,.9);color:var(--text);border:none;cursor:pointer;font-size:12px;line-height:1;
  display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;box-shadow:var(--shadow-sm);
}
```

- [ ] **Step 2: 修改列印樣式**

Modify `v4/css/layout.css` 的 `@media print` 區塊（第 201-204 行附近）：將

```css
  .photo-add,.photo-empty,.photo-thumb .remove,.photo-thumb .edit-btn{display:none!important}
  .photo-grid{grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:7px}
  .photo-thumb{aspect-ratio:1/1;border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
  .photo-thumb img{object-fit:cover}
```

改為：

```css
  .photo-add,.photo-empty,.photo-thumb .remove,.photo-thumb .edit-btn,.photo-thumb .resize-handle{display:none!important}
  .photo-grid{display:flex;flex-wrap:wrap;gap:7px}
  .photo-thumb{border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
  .photo-thumb img{object-fit:contain}
```

- [ ] **Step 3: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`，上傳多張照片。
Expected: 照片以原始比例（不裁切）排列，每張右下角有把手（游標移上顯示）；點「列印 / 匯出 PDF」，列印預覽中把手消失、照片維持設定尺寸。

- [ ] **Step 4: Commit**

```bash
git add v4/css/layout.css
git commit -m "feat(v4): 照片版面改為 flex-wrap 並加入縮放把手樣式"
```

---

### Task 3: 照片拖曳縮放邏輯（document.js）

**Files:**
- Modify: `v4/js/document.js`（`bindDocument` 內加入縮放事件委派）

**Interfaces:**
- Consumes: `.resize-handle[data-resize=<id>]`（Task 1 產生）、`state.images[side]`、`persistImages()`。
- Produces: 拖曳把手時即時更新該照片 inline 寬高，鬆開時把 `dispW/dispH` 寫回照片物件並 `persistImages()`。

- [ ] **Step 1: 加入縮放事件委派**

Modify `v4/js/document.js`：在 `bindDocument` 內、現有的 `doc.addEventListener("click", …)` 區塊（第 155-174 行）**之後**，加入：

```js
  /* 照片縮放把手（Pointer Events） */
  doc.addEventListener("pointerdown", e=>{
    const handle = e.target.closest(".resize-handle");
    if(!handle) return;
    e.preventDefault();
    const id = handle.dataset.resize;
    const thumb = handle.closest(".photo-thumb");
    if(!thumb) return;
    const zone = thumb.closest(".photo-zone");
    const maxW = zone ? Math.max(40, zone.clientWidth - 10) : 800;
    const startX = e.clientX, startY = e.clientY;
    const startW = thumb.offsetWidth, startH = thumb.offsetHeight;
    function onMove(ev){
      const w = Math.min(maxW, Math.max(40, startW + (ev.clientX - startX)));
      const h = Math.max(40, startH + (ev.clientY - startY));
      thumb.style.width = w+"px";
      thumb.style.height = h+"px";
    }
    function onUp(){
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const w = thumb.offsetWidth, h = thumb.offsetHeight;
      ["before","after"].forEach(side=>{
        const p = state.images[side].find(x=>x.id===id);
        if(p){ p.dispW = w; p.dispH = h; }
      });
      persistImages();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  });
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/document.js`
Expected: exit 0，無輸出。

- [ ] **Step 3: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`，上傳照片後拖曳右下角把手：
1. 寬度和高度可**獨立**調整（不等比）。
2. 最小 40px，最大不超過照片區寬度。
3. 鬆開後刷新頁面，尺寸仍保留（IndexedDB 持久化）。
4. 印列預覽中尺寸正確、把手隱藏。

- [ ] **Step 4: Commit**

```bash
git add v4/js/document.js
git commit -m "feat(v4): 照片拖曳縮放邏輯（Pointer Events）"
```

---

### Task 4: A4 直／橫向切換（UI + 邏輯）

**Files:**
- Modify: `v4/index.html`（工具列）
- Modify: `v4/js/main.js`（方向套用）

**Interfaces:**
- Consumes: `STORE.orient`（`kai.gen.orient.v1`）。
- Produces: 工具列 `#orientSel` 下拉；`document.body` 帶 `.orient-landscape` class（橫向）；`<style id="orientStyle">` 注入 `@page{size:A4 landscape;margin:0}`（橫向）、移除（直向）。

- [ ] **Step 1: 工具列加入下拉選單**

Modify `v4/index.html`：將目前的工具列（第 155-158 行）替換為：

```html
    <div class="toolbar">
      <select id="orientSel" class="orient-sel" title="選擇紙張方向">
        <option value="portrait">A4 直向</option>
        <option value="landscape">A4 橫向</option>
      </select>
      <button class="btn btn-outline btn-sm" id="printBtn">列印 / 匯出 PDF</button>
      <button class="btn btn-outline btn-sm" id="resetBtn">一鍵清除全部</button>
    </div>
```

- [ ] **Step 2: main.js 加入方向套用**

Modify `v4/js/main.js`：在 `init()` 內、`$("printBtn").addEventListener(...)` 區塊**之前**加入：

```js
  /* A4 直橫向 */
  const orientSel = $("orientSel");
  let orientStyleEl = null;
  function applyOrientation(orient, persist){
    document.body.classList.toggle("orient-landscape", orient === "landscape");
    if(orient === "landscape"){
      if(!orientStyleEl){
        orientStyleEl = document.createElement("style");
        orientStyleEl.id = "orientStyle";
        orientStyleEl.textContent = "@page{size:A4 landscape;margin:0}";
        document.head.appendChild(orientStyleEl);
      }
    } else if(orientStyleEl){
      orientStyleEl.remove();
      orientStyleEl = null;
    }
    if(persist) localStorage.setItem(STORE.orient, orient);
  }
  if(orientSel){
    orientSel.value = localStorage.getItem(STORE.orient) === "landscape" ? "landscape" : "portrait";
    applyOrientation(orientSel.value, false);
    orientSel.addEventListener("change", ()=> applyOrientation(orientSel.value, true));
  }
```

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/main.js`
Expected: exit 0，無輸出。

- [ ] **Step 4: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`：
1. 工具列出現「A4 直向／A4 橫向」下拉（預設直向）。
2. 切到橫向 → `document.body` 有 `.orient-landscape` class，`<style id="orientStyle">` 出現。
3. 切回直向 → class 與 style 移除。
4. 刷新頁面 → 方向保留。

- [ ] **Step 5: Commit**

```bash
git add v4/index.html v4/js/main.js
git commit -m "feat(v4): A4 直橫向切換（工具列 + 邏輯）"
```

---

### Task 5: A4 橫向版面 CSS

**Files:**
- Modify: `v4/css/layout.css`

**Interfaces:**
- Consumes: `body.orient-landscape` class（Task 4 產生）。
- Produces: 橫向時文件加寬、標題加大、`.doc` 變 grid（改善前後在左、預期效益在右直排）；含 `@media print` 與窄螢幕回復。

- [ ] **Step 1: 加入 `.orient-sel` 樣式**

Modify `v4/css/layout.css`：在 `.toolbar{…}` 規則（第 51 行）之後加入：

```css
.orient-sel{
  height:32px;font-size:12px;padding:0 10px;border-radius:8px;
  border:1px solid var(--line-dark);background:var(--surface);color:var(--text);
  cursor:pointer;font-family:inherit;
}
```

- [ ] **Step 2: 加入螢幕橫向版面**

Modify `v4/css/layout.css`：在 `footer{…}` 規則（第 173 行）之後、`/* ---------- 響應式 ---------- */` 之前加入：

```css
/* ---------- A4 橫向 ---------- */
body.orient-landscape .doc{max-width:1180px}
body.orient-landscape .doc-title{font-size:34px}
body.orient-landscape .kaizen-pair{gap:20px}
body.orient-landscape .doc{display:grid;grid-template-columns:1fr 320px;gap:18px}
body.orient-landscape .doc-header{grid-column:1/-1}
body.orient-landscape .kaizen-pair{grid-column:1;grid-row:2;margin-top:6px}
body.orient-landscape .benefit-box{grid-column:2;grid-row:2;margin-top:6px;align-self:stretch}
body.orient-landscape .benefit-cols{grid-template-columns:1fr}
body.orient-landscape .benefit-col{border-right:none;border-bottom:1px solid var(--line)}
body.orient-landscape .benefit-col:last-child{border-bottom:none}
```

- [ ] **Step 3: 加入列印與窄螢幕回復**

Modify `v4/css/layout.css`：

(a) 在 `@media print` 區塊**內**（`.photo-thumb img{object-fit:contain}` 規則之後）加入：

```css
  body.orient-landscape .doc{display:grid;grid-template-columns:1fr 300px;gap:16px;padding:12mm 14mm}
  body.orient-landscape .doc-header{grid-column:1/-1}
  body.orient-landscape .kaizen-pair{grid-column:1;grid-row:2;margin-top:6px}
  body.orient-landscape .benefit-box{grid-column:2;grid-row:2;margin-top:6px;align-self:stretch}
  body.orient-landscape .benefit-cols{grid-template-columns:1fr!important}
  body.orient-landscape .benefit-col{border-right:none!important;border-bottom:1px solid var(--line)!important}
  body.orient-landscape .benefit-col:last-child{border-right:none!important;border-bottom:none!important}
```

(b) 在 `@media screen and (max-width:980px)` 區塊**內**（`.benefit-col:last-child{border-bottom:none}` 之後）加入：

```css
  body.orient-landscape .doc{display:block;max-width:900px}
```

- [ ] **Step 4: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`：
1. 切到「A4 橫向」→ 文件加寬，改善前後在左、預期效益移到右側直排。
2. 切回「A4 直向」→ 恢復原本上下配置。
3. 點「列印 / 匯出 PDF」→ 橫向列印預覽中版面正確（改善前後左、效益右），紙張方向為橫向。
4. 縮窄視窗 → 橫向回復為上下排列。

- [ ] **Step 5: Commit**

```bash
git add v4/css/layout.css
git commit -m "feat(v4): A4 橫向版面與列印樣式"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（照片縮放→Task 1/2/3、A4 直橫向→Task 4/5）、三節資料流（dispW/dispH→IndexedDB、orient→localStorage）、五節驗收（拖曳不等比+刷新保留→Task 3、列印尺寸正確把手隱藏→Task 2/3、切換+刷新保留→Task 4、既有照片等比預設→Task 1、不裁切→Task 2）。無遺漏。
2. **Placeholder 掃描**：無 TBD／「implement later」；每個 code step 皆含完整程式碼。
3. **型別一致性**：欄位名 `dispW/dispH` 在 Task 1（讀取）、Task 3（寫回）一致；把手 `data-resize`、`.resize-handle` 在 Task 1/2/3 一致；`STORE.orient`、`.orient-landscape`、`#orientStyle` 在 Task 4/5 一致。
