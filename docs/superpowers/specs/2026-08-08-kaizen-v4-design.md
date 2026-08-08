# 改善提案生成器 V4 設計文件

日期：2026-08-08
狀態：已與使用者確認

## 一、背景與目標

現行版本（V3.5）為單一 `index.html`（CSS/JS/LOGO 全內嵌）。下一版（V4）不再限制於單一 HTML 檔案，改為**純 ES Modules、無建置工具**的多檔結構，並擴充下列功能：

1. **多模板系統**：不再只有單一版面，支援多個可套用的文件模板，欄位、版面、外觀皆可不同且可擴充。
2. **左側三頁籤**：敘述（改善前後輸入＋AI 生成）、通用設定（API Key＋圖片壓縮等）、模板選擇。
3. **圖片編輯器**：上傳照片後可編輯（框線／塗鴉／箭頭／文字／裁剪／旋轉），非破壞式疊加。
4. **AI 照片視覺分析**：將照片送視覺模型自動產生現況／對策描述。
5. **AI 簡報生成**：依內容自動生成一頁式簡報並可列印／匯出 PDF。

技術架構維持：仍可直接開啟 `index.html` 或部署至 GitHub Pages（靜態、無建置）。

## 二、架構與模組結構

```
index.html                入口（版面骨架 + 載入 css/ 與 js/main.js）
css/
  base.css                共用樣式（變數、按鈕、表單、側欄）
  layout.css              左側欄＋右側文件區＋頁籤版面
  print.css               列印基礎（@page、print-color-adjust）
js/
  main.js                 啟動、組裝、頁籤路由、全域錯誤處理
  store.js                集中狀態：documentData、settings；localStorage/IndexedDB 持久化
  ai.js                   供應商抽象：Gemini / OpenAI / OpenRouter / Groq 呼叫與模型清單
  prompts.js              各類 prompt（自動填表／正式措辭／照片視覺分析／簡報生成）
  sidebar.js              3 頁籤容器與切換
  tab-narrative.js        敘述頁籤：改善前後輸入、列點預覽、AI 一鍵生成、正式措辭、照片上傳
  tab-settings.js         通用設定頁籤：API 供應商／Key／模型、圖片壓縮、A4 直橫向、LOGO
  tab-templates.js        模板選擇頁籤：模板卡片、預覽、切換
  document.js             右側文件渲染：依目前模板渲染 documentData
  analysis.js             彩色列點／強調詞著色／SVG 圖示渲染（沿用 V3.5 邏輯）
  editor/
    editor.js             圖片編輯器（模態框、canvas、疊加層管理）
    tools.js              工具實作：框線、塗鴉、箭頭、文字、裁剪、旋轉
  templates/
    index.js              模板註冊、解析、列舉
    generic/              通用改善模板
    safety/               施工安全模板
    quality/              品質管理模板
    slide/                簡報模板（供 AI 簡報生成使用）
```

**相依規則**：`tab-*.js` 與 `document.js` 只依賴 `store.js` 與 `templates/index.js`；`editor/` 獨立；`ai.js` 只依賴 `store.js` 與 `prompts.js`。各模板為獨立資料夾，新增模板不需改主程式。

## 三、資料模型（語意欄位）

所有模板共用一套語意欄位，切換模板時內容不流失，AI 生成與模板無關。

```js
documentData = {
  title: "",                  // 改善主題
  docTitle: "",               // 文件標題（可自訂）
  before: "",                 // 改善前（可含 ** 強調標記）
  after: "",                  // 改善後
  benefits: ["", "", ""],     // 預期效益三欄
  photos: {
    before: [ { id, name, dataUrl, mime, overlay } ],
    after:  [ { id, name, dataUrl, mime, overlay } ]
  },
  extra: {}                   // 模板專用欄位（依模板定義）
}

settings = {
  provider, keys: {gemini, openai, openrouter, groq},
  model, catalog,
  compress, compressMax,
  orient,                    // A4 直向／橫向
  imgSize: { main, thumb },  // 照片顯示大小
  logo                       // base64 LOGO
}
```

**模板資料模型**（`templates/<id>/template.json`）：
```json
{
  "id": "generic",
  "name": "通用改善提案",
  "desc": "…",
  "thumbnail": "…",          // 預覽縮圖（可選）
  "fields": [ "before", "after", "benefits" ],   // 需要顯示的語意欄位
  "extraFields": [ { key, label, type } ],       // 模板專用欄位（可選）
  "orientation": "portrait",  // portrait | landscape
  "theme": { "primary": "#…", "beforeColor": "…", "afterColor": "…" }
}
```
- `render.js`：輸出右側文件的 HTML（依 documentData 渲染）。
- `print.css`：該模板的列印樣式。

## 四、左側三頁籤

- **敘述（tab-narrative）**
  - 改善前／改善後輸入框（含「標題：內容」列點預覽、SVG 圖示、強調詞著色）
  - 「AI 一鍵生成」（自動填表＋正式措辭並行）
  - 正式措辭描述框（複製／清除）
  - 照片上傳（多張、拖曳、壓縮設定套用、縮圖編輯入口）
- **通用設定（tab-settings）**
  - API 供應商下拉（Gemini/OpenAI/OpenRouter/Groq）、Key、模型＋重新載入
  - 圖片壓縮開關＋最大邊長拉桿
  - A4 直向／橫向、文件標題、LOGO 上傳
- **模板選擇（tab-templates）**
  - 模板卡片（名稱、說明、預覽縮圖）
  - 點選即切換，切換後右側以相同 documentData 重新渲染

頁籤以原生 JS 切換（`.tab` 顯示／隱藏），共用同一組頂部頁籤列。

## 五、圖片編輯器（非破壞式）

- 每張照片的 `overlay` 資料結構：
```js
overlay = {
  rects:  [ { x, y, w, h, color, width } ],     // 框線
  strokes:[ { points:[], color, width, opacity } ], // 塗鴉
  arrows: [ { x1,y1,x2,y2, color, width } ],     // 箭頭
  texts:  [ { x, y, text, color, size, bold } ], // 文字
  crop:   null | { x, y, w, h },                 // 裁剪（原圖座標）
  rotate: 0 | 90 | 180 | 270                    // 旋轉
}
```
- 編輯器以**模態框**開啟（點縮圖右上編輯按鈕），canvas 疊加原圖＋疊加層。
- 工具列：框線、塗鴉、箭頭、文字、裁剪、旋轉、復原（Undo）、清除疊加、完成／取消。
- 疊加層物件可選取／拖曳／刪除。
- 持久化：`photos` 與 `overlay` 存於 IndexedDB（沿用現有 `kai_gen` DB）。
- 列印／PDF：將原圖＋疊加渲染成合成圖輸出（`canvas.toDataURL` 暫存於渲染階段）。

## 六、AI 功能

### 6.1 照片視覺分析
- 敘述頁籤新增「AI 分析照片」按鈕。
- 將改善前／後照片（壓縮後 dataUrl）以 inline data 送給支援視覺的模型：
  - Gemini：`parts: [{ inlineData: { mimeType, data } }]`
  - OpenAI / OpenRouter / Groq：`messages[].content = [{ type:"image_url", image_url:{url:dataUrl} }]`
- 若目前模型不支援視覺，提示改用 Gemini 2.5 Flash／GPT-4o 等。
- 回傳 JSON：`{ before, after }`，填入對應欄位（遵循「最近編輯側」規則）。

### 6.2 AI 簡報生成
- 於模板選擇中選擇「簡報模板（slide）」，或敘述頁籤按「生成簡報」。
- AI 依 documentData（改善主題、前後、效益）生成一頁簡報內容：
  - JSON：`{ slideTitle, keyPoints[3], benefits[3], conclusion }`
- `templates/slide/` 渲染成一頁式簡報（大標題、重點列、效益、結語），含列印樣式。

## 七、錯誤處理與健壯性

- 全域 `window.onerror` / `unhandledrejection` 顯示提示（沿用現有 status 樣式）。
- 供應商 API 錯誤訊息帶入使用者可理解的說明。
- 圖片編輯器：非破壞式，取消時不儲存；復原堆疊限制 50 步。
- 模板載入失敗（render.js 缺檔）時回退到 generic 模板並提示。
- 所有資料仍僅存瀏覽器（localStorage + IndexedDB）。

## 八、遷移與相容

- 從 V3.5 單檔遷移：既有 localStorage key（`kai.gen.*`）與 IndexedDB（`kai_gen`）沿用，資料不流失。
- 使用 `file://` 開啟時，ES Modules 在部分瀏覽器有 CORS 限制，需以本機伺服器或 GitHub Pages 使用；`index.html` 仍可雙擊開啟（退路：提供「單檔打包」工具將多檔合併成單一 HTML，供離線雙擊使用）。

## 九、驗收標準（Success Criteria）

1. 三個頁籤可正常切換，既有功能（AI 生成、正式措辭、照片上傳/壓縮、直橫向、LOGO、一鍵清除）全部保留且運作正常。
2. 至少 3 個初始模板（通用／施工安全／品質管理）可選擇並切換，切換後內容保留、右側正確渲染、PDF 正確輸出。
3. 照片可開啟編輯器，加入框線／塗鴉／箭頭／文字並裁剪／旋轉，取消不影響原圖，完成後列印包含疊加效果。
4. AI 照片視覺分析能依照片內容生成描述並填入。
5. AI 簡報生成能產出一頁式簡報並列印。
6. 新增一個模板（放新資料夾）不需修改主程式即可被選用。

## 十、實作順序（Phases，各階段獨立交付）

| 階段 | 內容 | 交付 |
|------|------|------|
| P1 | 架構重構＋3 頁籤側欄：拆 ES Modules、建立 store/ai/prompts/sidebar、既有功能搬入「敘述」與「通用設定」頁籤 | 功能與 V3.5 等價，頁籤化 |
| P2 | 模板系統：語意資料模型、templates/index.js、document.js、模板選擇頁籤、generic／safety／quality 三個初始模板 | 可切換多模板 |
| P3 | 圖片編輯器：editor/editor.js、tools.js、overlay 持久化、模態框 | 照片可編輯並列印 |
| P4 | AI 照片視覺分析：視覺模型呼叫、分析按鈕、描述填入 | 照片→描述 |
| P5 | AI 簡報生成：slide 模板、prompt、一頁簡報渲染與列印 | 一頁簡報輸出 |

每階段皆需通過相對應的驗收標準並可獨立 push 上線。

