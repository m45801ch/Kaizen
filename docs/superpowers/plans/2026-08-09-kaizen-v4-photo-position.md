# V4 照片自由定位＋移動＋置中 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓照片改為自由定位，可在「改善前/後」區域內拖動位置，並可一鍵置中到區域中央。

**Architecture:** 照片物件新增 `dispX/dispY`（px）欄位（IndexedDB 持久化）；`.photo-grid` 改 `position:relative`、`.photo-thumb` 改 `position:absolute` 由 inline `left/top/width/height` 定位；`renderDocument` 在 render 後對每個照片區跑 `layoutPhotos(side)` 計算預設位置與 grid 高度；新增照片本體拖動（pointer capture）與「置中」按鈕。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/shared.js`、`v4/js/document.js`、`v4/css/layout.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- `dispX/dispY`：照片在區域內位置（px），省略時由 render 自動計算；`persistImages()` 整包存入 IndexedDB。
- 拖動移動：clamp 於區域內（0 ~ 區域內容寬-照片寬、0 ~ 區域內容高-照片高）；`setPointerCapture`；鬆開寫回並 `persistImages()`。
- 置中：`dispX=round((區域內容寬-照片寬)/2)`、`dispY=round((區域內容高-照片高)/2)`（至少 0）。
- 預設位置：render 後依區域內容寬度由左而右、超出換行；grid 高度 = max(所有照片 bottom, 64)。
- `.photo-grid` 改 `position:relative` 非 flex；`.photo-thumb` 改 `position:absolute`；移除 `flex:0 0 auto`。
- 縮放把手（dispW/dispH）、`object-fit:fill`、移除/編輯、拖曳上傳、列印照片輸出方式不變。
- 列印時 `.center-btn` 與 remove/edit-btn 一起隱藏。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 版面改為自由定位（CSS + shared.js）

**Files:**
- Modify: `v4/css/layout.css`（`.photo-grid`、`.photo-thumb`、列印）
- Modify: `v4/js/templates/shared.js`（`photoZone`）

**Interfaces:**
- Produces: `.photo-grid{position:relative}`；`.photo-thumb{position:absolute;left:…;top:…;width:…;height:…}`（inline）；每張含 `.center-btn[data-center=<id>]`；`.photo-zone` padding 不變。

- [ ] **Step 1: 修改螢幕 CSS**

Modify `v4/css/layout.css`：將目前的 `.photo-grid` 與 `.photo-thumb` 規則（第 100-104 行）
```css
.photo-grid{display:flex;flex-wrap:wrap;gap:9px;align-items:flex-start}
.photo-thumb{
  position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--line);
  background:var(--surface);flex:0 0 auto;box-shadow:var(--shadow-sm);
}
```
替換為：
```css
.photo-grid{position:relative;min-height:64px}
.photo-thumb{
  position:absolute;border-radius:10px;overflow:hidden;border:1px solid var(--line);
  background:var(--surface);box-shadow:var(--shadow-sm);
}
```

- [ ] **Step 2: 修改列印 CSS**

Modify `v4/css/layout.css`：在 `@media print` 內、`.photo-grid{display:flex;flex-wrap:wrap;gap:7px}`（第 228 行）與 `.photo-thumb{…}`（第 229 行）
```css
  .photo-grid{display:flex;flex-wrap:wrap;gap:7px}
  .photo-thumb{border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
```
替換為：
```css
  .photo-grid{position:relative;min-height:64px}
  .photo-thumb{border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
```

並將 `.photo-add,.photo-empty,.photo-thumb .remove,.photo-thumb .edit-btn,.photo-thumb .resize-handle{display:none!important}`（第 227 行）改為：
```css
  .photo-add,.photo-empty,.photo-thumb .remove,.photo-thumb .edit-btn,.photo-thumb .resize-handle,.photo-thumb .center-btn{display:none!important}
```

- [ ] **Step 3: 修改 `shared.js` 的 `photoZone`**

Modify `v4/js/templates/shared.js`：將目前的 `photoZone`（第 19-38 行）整體替換為：
```js
export function photoZone(side, photos){
  const list = photos[side]||[];
  let thumbs = list.map(p=>{
    const ratio = (p.w && p.h) ? p.h/p.w : 1;
    const w = p.dispW || 260;
    const h = p.dispH || Math.max(40, Math.round(260*ratio));
    const x = p.dispX || 0, y = p.dispY || 0;
    return '<div class="photo-thumb" style="left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px">'+
      '<img src="'+esc(p.previewDataUrl||p.dataUrl)+'" alt="'+esc(p.name||"照片")+'">'+
      '<button type="button" class="remove" data-remove="'+esc(p.id)+'" title="移除照片">✕</button>'+
      '<button type="button" class="edit-btn" data-edit="'+esc(p.id)+'" title="編輯照片">✎</button>'+
      '<button type="button" class="center-btn" data-center="'+esc(p.id)+'" title="置中">◎</button>'+
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

- [ ] **Step 4: 新增 `.center-btn` 樣式**

Modify `v4/css/layout.css`：在 `.photo-thumb .edit-btn{…}` 規則之後加入：
```css
.photo-thumb .center-btn{
  position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,.9);color:var(--text);border:none;cursor:pointer;font-size:13px;line-height:1;
  display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;box-shadow:var(--shadow-sm);
}
.photo-thumb:hover .center-btn{opacity:1}
.photo-thumb .center-btn:hover{color:var(--primary)}
```

- [ ] **Step 5: 驗證語法與樣式**

Run: `node --check v4/js/templates/shared.js`
Expected: exit 0，無輸出。
重新讀取 `v4/css/layout.css`：`.photo-grid`/`.photo-thumb`/`.center-btn` 規則括號平衡。

- [ ] **Step 6: Commit**

```bash
git add v4/css/layout.css v4/js/templates/shared.js
git commit -m "feat(v4): 照片改為絕對定位並加入置中按鈕"
```

---

### Task 2: 預設位置計算與照片拖動移動

**Files:**
- Modify: `v4/js/document.js`（`renderDocument`、新增 `layoutPhotos`、拖動事件）

**Interfaces:**
- Consumes: `state.images[side]`、`dispX/dispY`（Task 1 產生）。
- Produces: `layoutPhotos(side)` 計算並套用每張照片的 inline `left/top` 與 grid 高度；照片本體拖動更新 `dispX/dispY` 並 `persistImages()`。

- [ ] **Step 1: `renderDocument` 呼叫 `layoutPhotos`**

Modify `v4/js/document.js`：將目前 `renderDocument`（第 100-110 行）
```js
export function renderDocument(){
  const tpl = getTemplate(state.template);
  const view = { ...data, photos: state.images };
  const doc = $("doc");
  doc.innerHTML = tpl.render(view, { esc:(s)=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"), buildLines });
  /* 綁定 */
  bindDocument();
  /* LOGO */
  const el = $("logoImg");
  if(el) el.src = localStorage.getItem("kai.gen.logo.v1") || DEFAULT_LOGO;
}
```
替換為：
```js
export function renderDocument(){
  const tpl = getTemplate(state.template);
  const view = { ...data, photos: state.images };
  const doc = $("doc");
  doc.innerHTML = tpl.render(view, { esc:(s)=>String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"), buildLines });
  /* 照片位置計算 */
  ["before","after"].forEach(side=>{ if($("photo-grid-"+side)) layoutPhotos(side); });
  /* 綁定 */
  bindDocument();
  /* LOGO */
  const el = $("logoImg");
  if(el) el.src = localStorage.getItem("kai.gen.logo.v1") || DEFAULT_LOGO;
}
```

- [ ] **Step 2: 新增 `layoutPhotos`**

Modify `v4/js/document.js`：在 `renderDocument` 之後、`bindDocument` 之前插入：
```js
function layoutPhotos(side){
  const grid = $("photo-grid-"+side);
  if(!grid) return;
  const zone = $("photo-zone-"+side);
  const zoneW = zone ? zone.clientWidth - 24 : grid.clientWidth;   // 扣除 padding 12*2
  const zoneH = zone ? Math.max(64, zone.clientHeight - 24) : 64;
  const gap = 9;
  let x = 0, y = 0, rowH = 0, maxBottom = 64;
  state.images[side].forEach(p=>{
    const w = p.dispW || 260, h = p.dispH || Math.max(40, Math.round(260*((p.w&&p.h)?p.h/p.w:1)));
    let px, py;
    if(p.dispX!==undefined && p.dispY!==undefined){
      px = p.dispX; py = p.dispY;
    } else {
      if(x>0 && x+w>zoneW){ y += rowH+gap; x = 0; rowH = 0; }
      px = x; py = y;
      x += w+gap;
      if(h>rowH) rowH = h;
    }
    const thumb = grid.querySelector('.photo-thumb[data-resize="'+p.id+'"]');
    if(thumb){ thumb.style.left = px+"px"; thumb.style.top = py+"px"; }
    const bottom = py+h;
    if(bottom>maxBottom) maxBottom = bottom;
  });
  grid.style.height = maxBottom+"px";
}
```
注意：Task 1 的 `.photo-thumb` 沒有 `data-id` 屬性，但把手 `data-resize` 存在，可用它選取對應 thumb（id 唯一）。

- [ ] **Step 3: 新增照片本體拖動**

Modify `v4/js/document.js`：在 `bindDocument` 內、縮放把手 pointerdown 區塊（第 176-207 行）**之前**插入：
```js
  /* 照片移動：拖照片本體 */
  doc.addEventListener("pointerdown", e=>{
    const thumb = e.target.closest(".photo-thumb");
    if(!thumb) return;
    if(e.target.closest(".resize-handle,.remove,.edit-btn,.center-btn")) return;
    const id = thumb.querySelector("[data-resize]") ? thumb.querySelector("[data-resize]").dataset.resize : null;
    if(!id) return;
    const zone = thumb.closest(".photo-zone");
    const zoneW = zone ? Math.max(40, zone.clientWidth - 24) : 800;
    const zoneH = zone ? Math.max(40, zone.clientHeight - 24) : 600;
    const startX = e.clientX, startY = e.clientY;
    const baseX = thumb.offsetLeft, baseY = thumb.offsetTop;
    const maxX = Math.max(0, zoneW - thumb.offsetWidth), maxY = Math.max(0, zoneH - thumb.offsetHeight);
    function onMove(ev){
      const nx = Math.max(0, Math.min(maxX, baseX + (ev.clientX - startX)));
      const ny = Math.max(0, Math.min(maxY, baseY + (ev.clientY - startY)));
      thumb.style.left = nx+"px";
      thumb.style.top = ny+"px";
    }
    function onUp(){
      thumb.removeEventListener("pointermove", onMove);
      thumb.removeEventListener("pointerup", onUp);
      const lx = thumb.offsetLeft, ly = thumb.offsetTop;
      ["before","after"].forEach(side=>{
        const p = state.images[side].find(x=>x.id===id);
        if(p){ p.dispX = lx; p.dispY = ly; }
      });
      persistImages();
    }
    thumb.setPointerCapture(e.pointerId);
    thumb.addEventListener("pointermove", onMove);
    thumb.addEventListener("pointerup", onUp);
  });
```

- [ ] **Step 4: 驗證語法**

Run: `node --check v4/js/document.js`
Expected: exit 0，無輸出。

- [ ] **Step 5: Commit**

```bash
git add v4/js/document.js
git commit -m "feat(v4): 照片預設位置計算與拖動移動"
```

---

### Task 3: 置中按鈕事件

**Files:**
- Modify: `v4/js/document.js`（`bindDocument` 事件委派）

**Interfaces:**
- Consumes: `state.images[side]`、`dispX/dispY`、`photo-zone`。
- Produces: 點 `[data-center]` 將照片置中並 `renderDocument()` + `persistImages()`。

- [ ] **Step 1: 加入置中事件委派**

Modify `v4/js/document.js`：在 `bindDocument` 的 `doc.addEventListener("click",…)` 區塊（照片移除/編輯委派，約第 156-174 行）內、`const ed=e.target.closest("[data-edit]");` 區塊**之後**加入：
```js
    const ct=e.target.closest("[data-center]");
    if(ct){
      const id=ct.dataset.center;
      ["before","after"].forEach(side=>{
        const p=state.images[side].find(x=>x.id===id);
        if(p){
          const zone=$("photo-zone-"+side);
          const zoneW=zone?Math.max(40,zone.clientWidth-24):800;
          const zoneH=zone?Math.max(40,zone.clientHeight-24):600;
          const w=p.dispW||260, h=p.dispH||Math.max(40,Math.round(260*((p.w&&p.h)?p.h/p.w:1)));
          p.dispX=Math.max(0,Math.round((zoneW-w)/2));
          p.dispY=Math.max(0,Math.round((zoneH-h)/2));
          renderDocument();
          persistImages();
        }
      });
      return;
    }
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/document.js`
Expected: exit 0，無輸出。

- [ ] **Step 3: Commit**

```bash
git add v4/js/document.js
git commit -m "feat(v4): 照片置中按鈕"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件六節（資料模型→Task 1、版面→Task 1、拖動→Task 2、預設位置→Task 2、置中→Task 3、驗收 1-6→各 Task 手動驗證）。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`dispX/dispY` 在 Task 1（shared.js 讀取）、Task 2（layoutPhotos 計算＋拖動寫回）、Task 3（置中寫回）一致；`.center-btn[data-center]` 在 Task 1（產生）與 Task 3（消費）一致；`.photo-grid`/`.photo-thumb` id 名稱一致。
