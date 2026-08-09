# V4 公司 LOGO 功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 V4 具備與 V3 相同的公司 LOGO 功能（預設載入 V3 內建 LOGO、可更換／回復、記憶於 localStorage），並在「通用設定」頁籤提供 UI。

**Architecture:** 從 V3 `index.html` 抽出內嵌 base64 LOGO 存為 `DEFAULT_LOGO` 常數；`document.js` 渲染時以 `自訂 || 預設` 決定 src；在 `v4/index.html` 通用設定頁籤新增 LOGO 面板；`tab-settings.js` 實作上傳壓縮（寬度 ≤360px、PNG 保留透明）與回復邏輯。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架），localStorage 持久化，沿用 V4 既有的 `kaizen:status` CustomEvent 狀態訊息。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 沿用既有 localStorage key：`kai.gen.logo.v1`（與 V3 相同，V3 已存的 LOGO 可沿用）。
- 圖片壓縮規則：寬度縮放至 ≤360px、等比、輸出 `image/png`（保留透明背景）。
- 檔案編碼為 UTF-8；不得加入註解以外的無關程式碼；不得改動其他既有功能。
- 所有 LOGO 變更後須同步更新右側文件 `#logoImg`（含列印用）。

---

### Task 1: 抽出 V3 內建 LOGO 並建立 `DEFAULT_LOGO` 常數

**Files:**
- Create: `v4/js/logo-data.js`
- Modify: `v4/js/store.js`
- Read: `index.html`（僅讀取，不修改）

**Interfaces:**
- Produces: `v4/js/logo-data.js` 匯出 `export const DEFAULT_LOGO = "data:image/png;base64,…"`（V3 內建 LOGO 的完整 base64，長度 51574）。
- Produces: `v4/js/store.js` 新增 `export { DEFAULT_LOGO } from "./logo-data.js";`（供後續 task 由 `store.js` 匯入）。

- [ ] **Step 1: 寫一個 PowerShell 命令抽取 V3 的 base64 LOGO，產生 `logo-data.js`**

在專案根目錄（`Kaizen/`）執行（`--no-profile` 避免設定檔干擾）：

```powershell
$html = Get-Content "index.html" -Raw
if ($html -match 'src="(data:image/png;base64,[^"]+)"') {
  $b64 = $Matches[1]
  $content = "/* 預設公司 LOGO（取自 V3 內建，寬度 360px 內） */`r`nexport const DEFAULT_LOGO = `"$b64`";`r`n"
  Set-Content -Path "v4/js/logo-data.js" -Value $content -Encoding UTF8 -NoNewline
  Write-Output "OK length=$($b64.Length)"
} else { Write-Output "NOT FOUND" }
```

Expected: 輸出 `OK length=51574`。

- [ ] **Step 2: 驗證產生的檔案**

Run: `Get-Content "v4/js/logo-data.js" -TotalCount 2`
Expected: 第一行註解，第二行 `export const DEFAULT_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZwAAABuCAYAAAATbKWfAA…"`（開頭）。

- [ ] **Step 3: 在 `store.js` 匯出 `DEFAULT_LOGO`**

Modify `v4/js/store.js`：在 `export const STORE = {` 之前插入：

```js
export { DEFAULT_LOGO } from "./logo-data.js";

export const STORE = {
```

- [ ] **Step 4: 驗證模組可載入（無語法錯誤）**

Run: `node --input-type=module -e "import('./v4/js/store.js').then(m=>console.log(typeof m.DEFAULT_LOGO, (m.DEFAULT_LOGO||'').slice(0,22))).catch(e=>{console.error(e.message);process.exit(1)})"`
Expected: 輸出 `string data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZwAAABuCAYAAAATbKWfAA…`（node 匯入 `store.js` 時若有瀏覽器 API 會拋錯，見 Task 1 Step 4 註）。

> 註：若 node 因 `localStorage` 未定義而報錯，這是**可接受**的失敗——`store.js` 含瀏覽器專用頂層程式碼。改以 `node --check v4/js/logo-data.js` 驗證語法（Expected: 無輸出、exit 0），並以 `node -e "import('./v4/js/logo-data.js').then(m=>console.log(m.DEFAULT_LOGO.slice(0,22)))"` 驗證常數（Expected: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZwAAABuCAYAAAATbKWfAA`）。

- [ ] **Step 5: Commit**

```bash
git add v4/js/logo-data.js v4/js/store.js
git commit -m "feat(v4): 抽出 V3 內建 LOGO 為 DEFAULT_LOGO 常數"
```

---

### Task 2: 讓右側文件渲染時套用預設或自訂 LOGO

**Files:**
- Modify: `v4/js/document.js:100-110`（`renderDocument()` 的 LOGO 區塊）

**Interfaces:**
- Consumes: `DEFAULT_LOGO`（由 `v4/js/store.js` 匯出）
- Produces: `renderDocument()` 保證 `#logoImg.src` 為「localStorage 自訂 LOGO 若存在，否則 `DEFAULT_LOGO`」。

- [ ] **Step 1: 修改 `renderDocument()` 的 LOGO 設定**

Modify `v4/js/document.js`：

目前（約第 2 行）：
```js
import { state, data, saveForm, persistImages } from "./store.js";
```
改為：
```js
import { state, data, saveForm, persistImages, DEFAULT_LOGO } from "./store.js";
```

目前（約第 107-109 行）：
```js
  /* LOGO */
  const logo = localStorage.getItem("kai.gen.logo.v1");
  if(logo) $("logoImg").src = logo;
```
改為：
```js
  /* LOGO */
  const logo = localStorage.getItem("kai.gen.logo.v1") || DEFAULT_LOGO;
  if(logo) $("logoImg").src = logo;
```

- [ ] **Step 2: 手動驗證**

啟動本機伺服器：
```powershell
python -m http.server 8123
```
（若 python 不可用，改用 `npx http-server -p 8123`，或任一本機靜態伺服器。）

瀏覽器開啟 `http://localhost:8123/v4/index.html`，檢查右側文件標頭 LOGO 顯示 V3 同款圖片。
Expected: 右側文件標頭顯示預設公司 LOGO（與 V3 `index.html` 直開時相同）。

- [ ] **Step 3: Commit**

```bash
git add v4/js/document.js
git commit -m "feat(v4): 文件渲染套用預設 LOGO"
```

---

### Task 3: 通用設定頁籤新增「公司 LOGO」面板 UI

**Files:**
- Modify: `v4/index.html`（在 `#tab-settings` 內、「圖片壓縮」面板之後新增面板）

**Interfaces:**
- Produces HTML 元素（供 Task 4 綁定）：
  - `#logoPreview`（`<img>`，顯示目前 LOGO）
  - `#logoChangeBtn`（`<button>`，觸發隱藏 file input）
  - `#logoResetBtn`（`<button>`，回復預設）
  - `#logoInput`（`<input type="file" accept="image/*" hidden>`）

- [ ] **Step 1: 在 `v4/index.html` 新增 LOGO 面板**

Modify `v4/index.html`：在「圖片壓縮」面板的 `</div>`（`<div class="panel">…</div>` 結束，即第 115 行）與 `</section>`（`#tab-settings` 結束）之間插入：

```html
      <div class="panel">
        <div class="panel-head"><span class="bar"></span>公司 LOGO</div>
        <img id="logoPreview" alt="公司LOGO" style="height:40px;width:auto;max-width:180px;object-fit:contain;margin-bottom:10px;display:block">
        <div style="display:flex;gap:8px">
          <button type="button" class="btn btn-outline btn-sm" id="logoChangeBtn">更換LOGO</button>
          <button type="button" class="btn btn-outline btn-sm" id="logoResetBtn">回復</button>
        </div>
        <input type="file" id="logoInput" accept="image/*" hidden>
        <div class="hint" style="margin-top:8px">上傳自己的圖檔取代內建 LOGO，會自動壓縮至寬度 360px 內並記憶。</div>
      </div>
```

- [ ] **Step 2: 手動驗證（僅 UI 存在）**

伺服器持續執行時，瀏覽器開啟 `http://localhost:8123/v4/index.html`，切到「通用設定」頁籤。
Expected: 出現「公司 LOGO」面板，含預覽圖（目前空白或顯示預設）、更換LOGO／回復兩顆按鈕、隱藏 file input。

- [ ] **Step 3: Commit**

```bash
git add v4/index.html
git commit -m "feat(v4): 通用設定頁籤新增公司 LOGO 面板"
```

---

### Task 4: 實作 LOGO 更換／回復邏輯

**Files:**
- Modify: `v4/js/tab-settings.js`

**Interfaces:**
- Consumes: `DEFAULT_LOGO`、`STORE`（由 `v4/js/store.js` 匯出）、右側文件 `#logoImg`、`kaizen:status` CustomEvent。
- Produces: `initSettings()` 內初始化 LOGO 面板；更換/回復後同步更新 `#logoPreview` 與 `#logoImg`。

- [ ] **Step 1: 在 `tab-settings.js` 加入 LOGO 邏輯**

Modify `v4/js/tab-settings.js`：

目前（約第 2-3 行）：
```js
import { state, STORE } from "./store.js";
import { MODELS, HINTS, KEY_PLACEHOLDERS, fetchModels } from "./ai.js";
```
改為：
```js
import { state, STORE, DEFAULT_LOGO } from "./store.js";
import { MODELS, HINTS, KEY_PLACEHOLDERS, fetchModels } from "./ai.js";
```

目前（第 5 行）：
```js
const $ = id => document.getElementById(id);
```
之後插入：
```js

/* ---- 公司 LOGO ---- */
function compressLogo(dataUrl){
  return new Promise(resolve=>{
    const img = new Image();
    img.onload = () => {
      const maxW = 360;
      const scale = Math.min(1, maxW / (img.width || maxW));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
      canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function applyLogo(src){
  const img = $("logoImg");
  const prev = $("logoPreview");
  if(img) img.src = src;
  if(prev) prev.src = src;
}

function initLogo(){
  const preview = $("logoPreview");
  if(!preview) return;
  const custom = localStorage.getItem(STORE.logo) || DEFAULT_LOGO;
  preview.src = custom;
  $("logoChangeBtn").addEventListener("click", ()=> $("logoInput").click());
  $("logoInput").addEventListener("change", ()=>{
    const f = $("logoInput").files && $("logoInput").files[0];
    $("logoInput").value = "";
    if(!f) return;
    if(f.type.indexOf("image/")!==0){
      window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"error",html:"請選擇圖片檔。"}}));
      setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),3000);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      compressLogo(e.target.result).then(dataUrl=>{
        if(!dataUrl){
          window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"error",html:"無法讀取該圖片檔。"}}));
          setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),3000);
          return;
        }
        localStorage.setItem(STORE.logo, dataUrl);
        applyLogo(dataUrl);
        window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"success",html:"公司LOGO 已更換。"}}));
        setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),3000);
      });
    };
    reader.readAsDataURL(f);
  });
  $("logoResetBtn").addEventListener("click", ()=>{
    localStorage.removeItem(STORE.logo);
    applyLogo(DEFAULT_LOGO);
    window.dispatchEvent(new CustomEvent("kaizen:status",{detail:{kind:"success",html:"已回復預設LOGO。"}}));
    setTimeout(()=>window.dispatchEvent(new CustomEvent("kaizen:status-hide")),3000);
  });
}
```

目前（`initSettings()` 內，`renderProvider();` 之前，約第 91 行）：
```js
  renderProvider();
```
改為：
```js
  initLogo();
  renderProvider();
```

- [ ] **Step 2: 手動驗證完整流程**

伺服器開啟 `http://localhost:8123/v4/index.html`：

1. 右側文件標頭顯示預設 LOGO；切到「通用設定」頁籤，預覽圖同樣顯示預設 LOGO。
2. 點「更換LOGO」→ 選擇一張寬 >360px 的圖片（如 1000px 寬）→ 右側文件與預覽圖立即更新為該圖，且寬度壓縮至 ≤360px（可用 DevTools 檢查 `#logoImg` 或 `#logoPreview` 的 `naturalWidth`）。
3. 顯示「公司LOGO 已更換。」成功訊息。
4. 重新整理頁面 → LOGO 仍為自訂圖（localStorage 記憶）。
5. 點「回復」→ 右側與預覽回到預設 LOGO，顯示「已回復預設LOGO。」。
6. 點「列印 / 匯出 PDF」→ 列印預覽中的 LOGO 與畫面上一致。

Expected: 上述 6 項全部符合。

- [ ] **Step 3: Commit**

```bash
git add v4/js/tab-settings.js
git commit -m "feat(v4): LOGO 更換/回復邏輯與狀態訊息"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件四節（預設 LOGO→Task 1+2、渲染邏輯→Task 2、設定頁籤 UI→Task 3、更換/回復邏輯→Task 4），驗收標準 1–5 皆對應 Task 2 Step 2 與 Task 4 Step 2 之手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD／「implement later」；每個 code step 皆含完整程式碼或完整命令。
3. **型別一致性**：`DEFAULT_LOGO` 統一由 `store.js` 匯出，三個引用處（`document.js`、`tab-settings.js`、`logo-data.js`）名稱一致；`STORE.logo` 統一；`applyLogo` 使用 `#logoImg` 與 `#logoPreview`，與 Task 3 產生的 id 一致。
