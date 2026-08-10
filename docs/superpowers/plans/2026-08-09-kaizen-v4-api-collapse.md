# V4 API 設定面板預設收合 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 「通用設定」的 API 設定面板預設收合，點標題可展開/收合。

**Architecture:** 修改 `index.html` 的面板結構（`.panel collapsed` + `.panel-head collapsible` + `.panel-body` 包裹內容 + chevron），`tab-settings.js` 綁定點擊切換 `.collapsed`。CSS 收合機制已存在，不需改動。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/index.html`、`v4/js/tab-settings.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。
- `.panel collapsed` 預設收合；`.panel-head.collapsible` 可點擊切換；內容包在 `.panel-body`。
- API 設定功能邏輯不變；其他面板/頁籤不動。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: API 設定面板預設收合

**Files:**
- Modify: `v4/index.html`（API 設定面板）
- Modify: `v4/js/tab-settings.js`（點擊切換）

**Interfaces:**
- Produces: 面板 `.panel collapsed`、標題 `.panel-head collapsible`＋`.chevron`、內容包 `.panel-body`；點標題切換收合。

- [ ] **Step 1: 修改 `index.html` 的 API 設定面板**

Modify `v4/index.html`：將目前的 API 設定面板（第 77-104 行）整體替換為：
```html
      <div class="panel collapsed">
        <div class="panel-head collapsible"><span class="bar"></span>API 設定<span class="chevron">▾</span></div>
        <div class="panel-body">
          <div class="field">
            <label for="providerSelect">AI 供應商</label>
            <select id="providerSelect">
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
            </select>
          </div>
          <div class="field">
            <label for="apiKey">API Key</label>
            <div class="key-wrap">
              <input type="password" id="apiKey" autocomplete="off" spellcheck="false" placeholder="貼上你的 API Key…">
              <button type="button" class="toggle" id="toggleKey">顯示</button>
            </div>
            <div class="hint" id="keyHint"></div>
          </div>
          <div class="field">
            <label for="model">模型</label>
            <div class="key-wrap">
              <select id="model"></select>
            </div>
            <div class="hint" id="modelHint"></div>
          </div>
          <button type="button" class="btn btn-outline btn-sm" id="refreshModelsBtn" style="width:100%">重新載入模型清單 ⟳</button>
        </div>
      </div>
```

- [ ] **Step 2: 綁定點擊切換收合**

Modify `v4/js/tab-settings.js`：在 `initSettings()` 內、`renderProvider();` 呼叫**之前**加入：
```js
  document.querySelectorAll(".panel-head.collapsible").forEach(head=>{
    head.addEventListener("click",()=>{
      const panel=head.closest(".panel");
      if(panel) panel.classList.toggle("collapsed");
    });
  });
```

- [ ] **Step 3: 驗證語法**

Run: `node --check v4/js/tab-settings.js`
Expected: exit 0，無輸出。
重新讀取 `v4/index.html` 的 API 設定面板：標籤平衡、`.panel-body` 包住內容。

- [ ] **Step 4: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器），切到「通用設定」：
1. API 設定面板**預設收合**，只顯示標題＋chevron。
2. 點標題 → 展開，可設定供應商/Key/模型。
3. 再點標題 → 收合。
4. 圖片壓縮面板不受影響。

- [ ] **Step 5: Commit**

```bash
git add v4/index.html v4/js/tab-settings.js
git commit -m "feat(v4): API 設定面板預設收合"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（HTML→Step 1、JS→Step 2），驗收標準 1-4 對應 Step 4 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`.panel collapsed`/`.panel-head.collapsible`/`.panel-body`/`.chevron` 與既有 CSS（base.css:93-96）一致；id 名稱不變。
