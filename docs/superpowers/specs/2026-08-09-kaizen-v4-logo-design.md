# 改善提案生成器 V4：公司 LOGO 功能設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V3（`index.html`）已有完整的公司 LOGO 功能：內建預設 LOGO（base64 內嵌）、可上傳自訂 LOGO（自動壓縮至寬度 360px 內並記憶）、可回復為內建 LOGO，且更換後同步顯示於列印／PDF。

V4（`v4/`）目前**缺少此功能**：
- `js/templates/shared.js` 的 `docHeader()` 渲染 `<img id="logoImg" alt="公司LOGO">`，但**沒有預設 src**（LOGO 空白）。
- `js/document.js:108` 已能套用 `localStorage("kai.gen.logo.v1")` 中的自訂 LOGO，但沒有更換／回復的 UI 與邏輯。

本設計目標：讓 V4 具備與 V3 相同的公司 LOGO 功能，並**預設載入 V3 內建的同一張公司 LOGO**。

## 二、方案

依使用者的選擇，將更換／回復功能放在**左側「通用設定」頁籤**（符合 V4 既有設計文件），右側文件僅顯示 LOGO。

### 1. 預設 LOGO

- 從 V3 `index.html` 抽出內嵌 base64 圖片（`data:image/png;base64,…`，約 51KB），作為 V4 預設 LOGO 常數 `DEFAULT_LOGO`。
- 放置位置：`js/store.js`（匯出常數），供 `document.js` 渲染使用。

### 2. 渲染邏輯（`js/document.js`）

`renderDocument()` 中 LOGO 設定改為：

```
const logo = localStorage.getItem("kai.gen.logo.v1") || DEFAULT_LOGO;
if(logo) $("logoImg").src = logo;
```

即：有自訂 LOGO 用自訂，否則用預設 LOGO。切換模板後同樣套用（所有模板皆經 `shared.js docHeader()` 渲染 `#logoImg`）。

### 3. 通用設定頁籤 UI（`v4/index.html`）

在 `#tab-settings` 新增「公司 LOGO」面板：

- 預覽圖 `<img id="logoPreview">`（顯示目前 LOGO）。
- 「更換LOGO」按鈕 `#logoChangeBtn`（觸發隱藏 `<input type="file" id="logoInput" accept="image/*">`）。
- 「回復」按鈕 `#logoResetBtn`（還原為預設 LOGO）。
- 說明文字（自動壓縮至寬度 360px 內並記憶）。

### 4. 更換／回復邏輯（`js/tab-settings.js`）

比照 V3 實作：

- `initSettings()` 初始化 LOGO 面板：`#logoPreview` 顯示目前 LOGO（自訂或預設）。
- 「更換LOGO」→ 開啟 file input；選圖後用 `FileReader` 讀取，經 `compressLogo(dataUrl)` 壓縮。
  - `compressLogo`：以 Image 載入，寬度縮放至 ≤360px（等比），`canvas.toDataURL("image/png")` 輸出（保留透明背景）。
  - 成功後：寫入 `localStorage(STORE.logo, dataUrl)`，更新 `#logoPreview` 與右側 `#logoImg`，並顯示成功狀態訊息。
- 「回復」→ 移除 `localStorage` 的 LOGO key，`#logoPreview` 與右側 `#logoImg` 回到 `DEFAULT_LOGO`，顯示狀態訊息。

## 三、資料流

- 持久化沿用現有 key：`kai.gen.logo.v1`（與 V3 相同，使用者由 V3 儲存的 LOGO 可在 V4 直接沿用）。
- 狀態訊息沿用 V4 既有 `kaizen:status` CustomEvent 機制。

## 四、驗收標準

1. 開啟 V4 時，右側文件標頭顯示與 V3 相同的預設公司 LOGO。
2. 在「通用設定」頁籤可上傳自訂 LOGO，右側文件與預覽圖立即更新，寬度自動壓縮至 360px 內。
3. 按「回復」回到預設 LOGO。
4. 重新整理網頁後 LOGO 設定仍保留（localStorage）。
5. 列印／PDF 輸出的 LOGO 與畫面上一致。
