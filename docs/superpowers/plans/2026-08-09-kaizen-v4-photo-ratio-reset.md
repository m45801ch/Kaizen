# V4 照片恢復原比例按鈕 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 照片可一鍵恢復原圖比例（保留目前位置），消除拖曳造成的變形。

**Architecture:** `shared.js` 每張照片新增 `data-reset-ratio` 按鈕；`document.js` click 委派新增 `[data-reset-ratio]` 分支，重設 `dispW=260`、`dispH=round(260*h/w)`（保留 dispX/dispY），render+persist；`layout.css` 新增 `.ratio-btn` 樣式並在列印隱藏。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/shared.js`、`v4/js/document.js`、`v4/css/layout.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。
- 恢復原比例：`p.dispW=260`、`p.dispH=Math.max(40,Math.round(260*ratio))`，其中 `ratio=(p.w&&p.h)?p.h/p.w:1`；`dispX/dispY` 不變（位置保留）。
- 按鈕 `data-reset-ratio` 屬性名 → JS 用 `rt.dataset.resetRatio`。
- 列印時 `.ratio-btn` 加入 `display:none` 清單。
- 其他按鈕/功能/資料結構不變。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 照片恢復原比例按鈕

**Files:**
- Modify: `v4/js/templates/shared.js`（photoZone 加按鈕）
- Modify: `v4/js/document.js`（click 委派）
- Modify: `v4/css/layout.css`（`.ratio-btn` 樣式＋列印隱藏）

**Interfaces:**
- Produces: `.ratio-btn[data-reset-ratio=<id>]`；點擊重設 `dispW/dispH` 依原比例、保留位置，render+persist。

- [ ] **Step 1: `shared.js` 新增按鈕**

Modify `v4/js/templates/shared.js`：在 `center-btn` 那一行（第 30 行）之後插入：
```js
      '<button type="button" class="ratio-btn" data-reset-ratio="'+esc(p.id)+'" title="恢復原比例">⟲</button>'+
```

- [ ] **Step 2: `document.js` 新增 click 分支**

Modify `v4/js/document.js`：在 `[data-center]` 分支（第 213-231 行）之後、click 委派關閉 `});` 之前插入：
```js
    const rt=e.target.closest("[data-reset-ratio]");
    if(rt){
      const id=rt.dataset.resetRatio;
      ["before","after"].forEach(side=>{
        const p=state.images[side].find(x=>x.id===id);
        if(p){
          const ratio=(p.w&&p.h)?p.h/p.w:1;
          p.dispW=260;
          p.dispH=Math.max(40,Math.round(260*ratio));
          renderDocument();
          persistImages();
        }
      });
      return;
    }
```

- [ ] **Step 3: CSS 新增按鈕樣式**

Modify `v4/css/layout.css`：在 `.photo-thumb .center-btn:hover{color:var(--primary)}`（第 129 行）之後插入：
```css
.photo-thumb .ratio-btn{
  position:absolute;top:34px;left:6px;width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,.9);color:var(--text);border:none;cursor:pointer;font-size:14px;line-height:1;
  display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;box-shadow:var(--shadow-sm);
}
.photo-thumb:hover .ratio-btn{opacity:1}
.photo-thumb .ratio-btn:hover{color:var(--primary)}
```

- [ ] **Step 4: 列印隱藏按鈕**

Modify `v4/css/layout.css`：將 `@media print` 的 `display:none` 清單（第 234 行）
```css
  .photo-add,.photo-empty,.photo-thumb .remove,.photo-thumb .edit-btn,.photo-thumb .resize-handle,.photo-thumb .center-btn{display:none!important}
```
改為：
```css
  .photo-add,.photo-empty,.photo-thumb .remove,.photo-thumb .edit-btn,.photo-thumb .resize-handle,.photo-thumb .center-btn,.photo-thumb .ratio-btn{display:none!important}
```

- [ ] **Step 5: 驗證語法與樣式**

Run: `node --check v4/js/document.js`、`node --check v4/js/templates/shared.js`
Expected: 兩者 exit 0。
重新讀取 `v4/css/layout.css`：`.ratio-btn` 規則括號平衡、列印清單含 `.ratio-btn`。

- [ ] **Step 6: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器）：
1. 上傳一張非正方形照片 → 拖曳右下角把手使其變形。
2. 點左上角「⟲」按鈕 → 尺寸回到原比例（寬 260、高依比例），位置保留。
3. 未變形的照片點按鈕 → 尺寸維持原比例。
4. 刷新後尺寸保留。
5. 列印預覽中「⟲」按鈕不出現。

- [ ] **Step 7: Commit**

```bash
git add v4/js/templates/shared.js v4/js/document.js v4/css/layout.css
git commit -m "feat(v4): 照片一鍵恢復原比例（保留位置）"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（shared.js 按鈕→Step 1、document.js 點擊→Step 2、CSS→Step 3/4），驗收標準 1-5 對應 Step 6 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`data-reset-ratio`（HTML）與 `rt.dataset.resetRatio`（JS）一致；`ratio`/`dispW`/`dispH` 在 Step 2 內一致；`.ratio-btn` 在 Step 1/3/4 一致。
