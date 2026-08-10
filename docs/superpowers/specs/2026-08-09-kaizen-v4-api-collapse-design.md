# 改善提案生成器 V4：API 設定面板預設收合 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

「通用設定」頁籤的「API 設定」面板目前永遠展開，佔據側欄空間。使用者希望它能**收合**，且**預設為收合狀態**，使用時點擊標題再展開。

## 二、方案

CSS 已具備收合機制（`base.css:93-96`：`.panel-head.collapsible`、`.panel.collapsed .panel-body{display:none}`、`.chevron` 旋轉）。僅需修改 `v4/index.html` 與 `v4/js/tab-settings.js`：

### 1. `index.html`：API 設定面板套用收合結構

目前（第 77-104 行）：
```html
      <div class="panel">
        <div class="panel-head"><span class="bar"></span>API 設定</div>
        <div class="field">…</div>
        <div class="field">…</div>
        <div class="field">…</div>
        <button type="button" class="btn btn-outline btn-sm" id="refreshModelsBtn" style="width:100%">重新載入模型清單 ⟳</button>
      </div>
```
改為：
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
（`.panel collapsed` 預設收合；`.panel-head collapsible` 可點；chevron 指示狀態。）

### 2. `tab-settings.js`：綁定點擊切換

在 `initSettings()` 內（可於 `renderProvider()` 呼叫前）加入：
```js
  document.querySelectorAll(".panel-head.collapsible").forEach(head=>{
    head.addEventListener("click",()=>{
      const panel=head.closest(".panel");
      if(panel) panel.classList.toggle("collapsed");
    });
  });
```

## 三、不變項目

- API 設定功能（供應商/Key/模型/重新載入）邏輯不變。
- 圖片壓縮面板、其他頁籤、其他面板不動。

## 四、驗收標準

1. 開啟「通用設定」→ API 設定面板**預設收合**，只顯示「API 設定」標題＋chevron。
2. 點標題 → 展開，可設定供應商/Key/模型；chevron 旋轉。
3. 再點標題 → 收合。
4. 其他面板不受影響。
