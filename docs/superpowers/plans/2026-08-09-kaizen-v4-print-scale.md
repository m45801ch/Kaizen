# V4 列印照片等比縮放 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 列印/PDF 時將照片區等比縮放，保留螢幕排版位置且不裁切、右側有間距。

**Architecture:** `layoutPhotos` 每次計算時依方向推導列印欄內容寬 `printW`，並把 `s=printW/zoneW`（夾 0.3~1）寫入 grid 的 CSS 變數 `--ps`、把 grid 高度寫入 `--ph`；`@media print` 用 `transform:scale(var(--ps,1))`（origin top left）縮放整張照片區，並用 `height:calc(var(--ph,64px)*var(--ps,1))` 同步縮放高度。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/document.js`、`v4/css/layout.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- `printW` 計算（依方向）：
  - 直向：`printW = Math.round((Math.round(180*96/25.4) - 11)/2) - 20`。
  - 橫向（`document.body.classList.contains("orient-landscape")`）：`printW = Math.round(Math.round(269*96/25.4) - 316) - 20`。
- `s = printW / zoneW`，夾在 `0.3 ~ 1`（`Math.min(1, Math.max(0.3, s))`）。
- `zoneW` 無法取得（無 zone 時）→ 不設變數（列印時 scale 預設 1）。
- 列印 CSS：`.photo-grid{position:relative;min-height:0;overflow:visible;transform:scale(var(--ps,1));transform-origin:top left;height:calc(var(--ph,64px)*var(--ps,1))}`；`.photo-thumb{position:absolute;...}`（改回絕對定位）。
- 螢幕不受影響；其他列印樣式不變；不得加入無關程式碼。

---

### Task 1: 列印照片等比縮放

**Files:**
- Modify: `v4/js/document.js`（`layoutPhotos`）
- Modify: `v4/css/layout.css`（`@media print` 的 `.photo-grid`/`.photo-thumb`）

**Interfaces:**
- Produces: grid 上 CSS 變數 `--ps`（縮放比例）、`--ph`（grid 高度 px）；列印時照片區等比縮放。

- [ ] **Step 1: `layoutPhotos` 寫入 `--ps`/`--ph`**

Modify `v4/js/document.js`：將目前 `layoutPhotos` 的結尾（第 137 行）
```js
  grid.style.height = maxBottom+"px";
}
```
替換為：
```js
  grid.style.height = maxBottom+"px";
  const landscape = document.body.classList.contains("orient-landscape");
  const printW = landscape
    ? Math.round(Math.round(269*96/25.4) - 316) - 20
    : Math.round((Math.round(180*96/25.4) - 11)/2) - 20;
  if(zoneW>0){
    let s = printW / zoneW;
    s = Math.min(1, Math.max(0.3, s));
    grid.style.setProperty("--ps", String(s));
    grid.style.setProperty("--ph", String(maxBottom));
  }
}
```

- [ ] **Step 2: 列印 CSS 套用縮放並改回絕對定位**

Modify `v4/css/layout.css`：將 `@media print` 內目前的 `.photo-grid` 與 `.photo-thumb`（第 235-236 行）
```css
  .photo-grid{display:flex;flex-wrap:wrap;gap:7px;position:static;height:auto!important;min-height:0;overflow:visible}
  .photo-thumb{position:static;border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
```
替換為：
```css
  .photo-grid{position:relative;min-height:0;overflow:visible;transform:scale(var(--ps,1));transform-origin:top left;height:calc(var(--ph,64px)*var(--ps,1))}
  .photo-thumb{position:absolute;border:1px solid var(--line);border-radius:6px;overflow:hidden;box-shadow:none}
```

- [ ] **Step 3: 驗證語法與樣式**

Run: `node --check v4/js/document.js`
Expected: exit 0，無輸出。
重新讀取 `v4/css/layout.css` 的 `@media print` 區塊：`.photo-grid`/`.photo-thumb` 括號平衡、無殘留 flex-wrap。

- [ ] **Step 4: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器）：
1. 上傳多張照片並在螢幕上拖動/置中安排位置。
2. 點「列印 / 匯出 PDF」→ 直向列印預覽中照片**等比縮小、位置保留、不裁切、右側有間距**。
3. 切到 A4 橫向 → 橫向列印預覽同樣正確。
4. 縮放後無多餘大塊空白（grid 高度同步縮放）。

- [ ] **Step 5: Commit**

```bash
git add v4/js/document.js v4/css/layout.css
git commit -m "feat(v4): 列印照片等比縮放保留排版位置"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（JS 寫入比例→Step 1、列印 CSS→Step 2），驗收標準 1-4 對應 Step 4 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`--ps`/`--ph` 在 Step 1（JS 寫入）與 Step 2（CSS 讀取）一致；`printW`/`zoneW`/`landscape` 在 Step 1 內一致。
