# 改善提案生成器 V4：工安模板重新設計 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 的「施工安全」（safety）模板目前沿用 generic 的版面與配色（紅綠改善前後、藍色效益欄），缺乏工安辨識度。本設計將其重新設計為**「工安」**模板：
- 模板名稱「施工安全」→「工安」。
- 警示黃×黑的工安經典配色、現代高對比排版。
- 保留「兩張照片卡片框體（改善前/後並排、可上傳照片）」。
- 強化「危險等級」欄位（大號色塊：紅=高、黃=中、綠=低）。
- 以「黃黑警示斜紋帶」作為簽名元素，融入標題分隔與卡片元素。

## 二、設計系統

### 色彩
| Token | 值 | 用途 |
|-------|-----|------|
| `--ga-dark` | `#141414` | 主文字、卡片框線、斜紋黑 |
| `--ga-yellow` | `#F2B705` | 標題帶、警示主色 |
| `--ga-yellow-hi` | `#FFC933` | 亮黃、hover |
| `--ga-bg` | `#F5F2EA` | 文件背景暖灰 |
| `--ga-white` | `#FFFFFF` | 卡片底、內容 |
| `--ga-red` | `#D63426` | 危險等級「高」 |

### 字體
- 沿用 `Noto Sans TC`（700/900 粗重、標題字距略縮），不引入花俏字型 — 工安需要硬朗直接。
- 標題 `工安改善提案表`：粗重、黑字、警示黃分隔。

### 簽名元素：黃黑警示斜紋帶
- 用 CSS `repeating-linear-gradient(45deg, 黑 0 12px, 黃 12px 24px)` 產生警示膠帶斜紋。
- 用於：文件標題下方分隔帶、卡片標題帶邊緣、危險等級色塊背景點綴。

## 三、模板結構（`v4/js/templates/safety/index.js` + 新增 `v4/css/safety.css`）

沿用既有語意欄位與模板機制（`docHeader`/`titleField`/`photoZone`/`analysisArea`/`benefitBox`、`d.extra.safetyLevel`），僅換版面 class 與樣式。檔案結構：

```
doc-header（強化：標題＋斜紋分隔帶）
title-field（改善主題）
level-row（危險等級：大色塊 高/中/低 + 輸入框）
kaizen-pair.ga（兩張照片卡片並排）
  kaizen-box.ga.before → 照片區 + 現況說明
  kaizen-box.ga.after  → 照片區 + 改善對策
benefit-box.ga（預期效益）
```

### 樣式（`v4/css/safety.css`）

- `.doc`：工安模式下暖灰背景、黑色粗框（覆寫 generic 的白色圓角框）。
- 標題分隔帶：`repeating-linear-gradient(45deg, #141414 0 12px, #F2B705 12px 24px)`，高 ~14px。
- `.kaizen-box.ga`：粗黑框（3px）、圓角小、白色底；標題帶黃色底黑字，編號徽章黑底黃字。
- 危險等級：三個可視色塊提示（紅/黃/綠）＋目前輸入值以大色塊顯示。
- 列印：保留斜紋（`print-color-adjust:exact` 已全域設定）；照片區列印行為沿用通用規則。

## 四、整合

- `v4/js/templates/index.js`：模板清單仍用 `safety`（id 不變，避免資料相容問題）；名稱顯示改為「工安」。
- `v4/js/main.js`：載入 `v4/css/safety.css`（僅在模板為 safety 時，或直接由 `index.html` 引入並以 body class 切換）。採用：`index.html` 引入 `css/safety.css`；模板切換時 `document.body.classList.toggle("tpl-safety", state.template==="safety")`（在 `main.js` renderDocument 流程中處理）。
- 通用 CSS（generic/quality）不受影響。

## 五、不變項目

- 語意欄位（title/before/after/benefits/safetyLevel）、照片上傳、拖曳/置中/縮放、AI 生成、列印輸出機制全不變。
- 模板 id `safety` 不變（舊資料相容）。
- generic/quality 模板樣式不動。

## 六、驗收標準

1. 模板名稱顯示「工安」。
2. 工安模板：警示黃×黑配色、黃黑斜紋分隔帶、黑框照片卡片並排、危險等級大色塊。
3. 改善前/後照片可正常上傳、顯示、列印。
4. 其他模板（通用/品質管理/簡報）樣式與功能不受影響。
5. 列印/PDF 輸出含工安配色與斜紋。
