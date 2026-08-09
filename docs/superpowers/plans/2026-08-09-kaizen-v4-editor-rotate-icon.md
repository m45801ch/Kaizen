# V4 編輯器旋轉互動與工具列圖示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓編輯器旋轉按鈕點擊即立即旋轉 90°（不需先選工具再點圖），並將工具列六個圖示換成更明確的 Lucide 圖示。

**Architecture:** 新增 `rotateImage()` 動作函式，旋轉按鈕改為直接呼叫；移除 pointerdown 的 rotate 分支與 hint。`TOOLS` 陣列的 path 替換為 Lucide path（`svgIcon()` 已輸出相容的 viewBox／描邊 SVG，不需改動）。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；僅改 `v4/js/editor/editor.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 旋轉按鈕：點擊立即 `rotateImage()`（`pushUndo(); overlay.rotate+=90; redraw();`），不切換 active tool、不更新 hint。
- 移除 pointerdown 的 `if(tool==="rotate")` 分支；`updateHint()` 的 hints 物件移除 `rotate` 鍵。
- `TOOLS` 圖示 path 依 spec 表格逐字替換；`svgIcon()` 不動。
- 其他工具行為、還原、完成／取消、`renderComposite()` 不動。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 旋轉按鈕改為立即旋轉

**Files:**
- Modify: `v4/js/editor/editor.js`

**Interfaces:**
- Produces: 模組層函式 `rotateImage()`；`[data-tool]` 點擊處理對 rotate 直接呼叫；移除 pointerdown rotate 分支與 hint 鍵。

- [ ] **Step 1: 新增 `rotateImage()`**

Modify `v4/js/editor/editor.js`：在 `pushUndo()` 函式定義（第 195 行附近）**之前**插入：

```js
function rotateImage(){
  if(!editing) return;
  pushUndo();
  editing.overlay.rotate=((editing.overlay.rotate||0)+90)%360;
  redraw();
}
```

- [ ] **Step 2: 工具列點擊處理對 rotate 直接呼叫**

Modify `v4/js/editor/editor.js`：將目前 `[data-tool]` 點擊處理（第 52-56 行）

```js
  modal.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    tool=b.dataset.tool;
    modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));
    updateHint();
  }));
```

改為：

```js
  modal.querySelectorAll("[data-tool]").forEach(b=>b.addEventListener("click",()=>{
    if(b.dataset.tool==="rotate"){ rotateImage(); return; }
    tool=b.dataset.tool;
    modal.querySelectorAll("[data-tool]").forEach(x=>x.classList.toggle("active",x===b));
    updateHint();
  }));
```

- [ ] **Step 3: 移除 pointerdown 的 rotate 分支**

Modify `v4/js/editor/editor.js`：刪除目前第 80 行

```js
    if(tool==="rotate"){ pushUndo(); editing.overlay.rotate=((editing.overlay.rotate||0)+90)%360; redraw(); return; }
```

- [ ] **Step 4: `updateHint` 移除 rotate 鍵**

Modify `v4/js/editor/editor.js`：將目前第 116 行

```js
  const hints={rect:"拖曳以繪製框線",draw:"按住拖曳以塗鴉",arrow:"拖曳以繪製箭頭",text:"點擊加入文字",crop:"拖曳選取要保留的區域",rotate:"點擊旋轉 90°"};
```

改為：

```js
  const hints={rect:"拖曳以繪製框線",draw:"按住拖曳以塗鴉",arrow:"拖曳以繪製箭頭",text:"點擊加入文字",crop:"拖曳選取要保留的區域"};
```

- [ ] **Step 5: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 6: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 旋轉按鈕點擊立即旋轉 90°"
```

---

### Task 2: 工具列圖示換成 Lucide

**Files:**
- Modify: `v4/js/editor/editor.js`（`TOOLS` 陣列）

**Interfaces:**
- Consumes: `svgIcon(p)`（`<svg viewBox="0 0 24 24" …>…</svg>`）。
- Produces: 六個工具的新 path（spec 表格逐字）。

- [ ] **Step 1: 替換 `TOOLS` 陣列的圖示 path**

Modify `v4/js/editor/editor.js`：將目前 `TOOLS` 陣列（第 11-18 行）整體替換為：

```js
const TOOLS=[
  ["rect","框線",'<rect x="3" y="3" width="18" height="18" rx="2"/>'],
  ["draw","塗鴉",'<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497zM15 5l4 4"/>'],
  ["arrow","箭頭",'<path d="M5 12h14m-7-7l7 7l-7 7"/>'],
  ["text","文字",'<path d="M12 4v16M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2M9 20h6"/>'],
  ["crop","裁剪",'<g><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></g>'],
  ["rotate","旋轉",'<g><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></g>']
];
```

- [ ] **Step 2: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 3: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 工具列圖示換成 Lucide"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（旋轉互動→Task 1、圖示→Task 2），驗收標準 1-3 對應 Task 1 Step 5/6 與 Task 2 Step 2/3 之手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`rotateImage()`（Task 1）命名與呼叫一致；`TOOLS` path 與 spec 表格逐字一致；`svgIcon()` 未改動。
