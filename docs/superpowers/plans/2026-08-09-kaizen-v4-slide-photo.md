# V4 一頁簡報整合照片 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓一頁簡報（slide）模板顯示使用者在改善前/後上傳的照片（每邊第一張，等比不壓扁）；無照片時維持純文字。

**Architecture:** slide 模板 render 讀 `d.photos.before/after`，有照片時在 `slide-body` 後輸出 `.slide-photos`（兩個 `.slide-photo` 半區＋標籤）；CSS 加入簡報照片樣式（`object-fit:contain`、flex 填滿）。`generateSlide`/`data.slide` 不需改動。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；`v4/js/templates/slide/index.js`、`v4/css/base.css`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。
- 照片每邊取第一張（`photosBefore[0]`/`photosAfter[0]`），用 `previewDataUrl||dataUrl`；`esc()` 轉義。
- 照片 `object-fit:contain`、`max-width/max-height:100%`，等比不壓扁、不裁切。
- 無照片時 `photoBlock` 為空字串，簡報維持純文字。
- 簡報文字生成、`data.slide`、其他模板、列印機制不動。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 簡報模板加入照片顯示

**Files:**
- Modify: `v4/js/templates/slide/index.js`（render）
- Modify: `v4/css/base.css`（簡報照片樣式）

**Interfaces:**
- Consumes: `d.photos.before/after`（與其他模板共用 `state.images`）。
- Produces: `.slide-photos`/`.slide-photo`/`.slide-photo-tag`；有照片時 render 輸出照片區。

- [ ] **Step 1: 修改 slide render 加入照片區**

Modify `v4/js/templates/slide/index.js`：將目前的 render（第 8-21 行）整體替換為：
```js
  render(d){
    const s = d.slide || { slideTitle:"", keyPoints:[], benefits:[], conclusion:"" };
    const points = Array.isArray(s.keyPoints)?s.keyPoints:[];
    const benefits = Array.isArray(s.benefits)?s.benefits:[];
    const photosBefore = (d.photos&&d.photos.before)||[];
    const photosAfter = (d.photos&&d.photos.after)||[];
    const photoBlock = (photosBefore.length||photosAfter.length)
      ? '<div class="slide-photos">'+
        (photosBefore.length?'<div class="slide-photo"><span class="slide-photo-tag">改善前</span><img src="'+esc(photosBefore[0].previewDataUrl||photosBefore[0].dataUrl)+'" alt="改善前"></div>':"")+
        (photosAfter.length?'<div class="slide-photo"><span class="slide-photo-tag">改善後</span><img src="'+esc(photosAfter[0].previewDataUrl||photosAfter[0].dataUrl)+'" alt="改善後"></div>':"")+
      "</div>"
      : "";
    return '<div class="slide-page">'+
      '<div class="slide-tag">改善提案簡報</div>'+
      '<div class="slide-title">'+esc(s.slideTitle||d.title||"改善提案")+'</div>'+
      '<div class="slide-body">'+
        '<ul class="slide-points">'+(points.length?points.map(k=>"<li>"+esc(k)+"</li>").join(""):'<li>尚無重點</li>')+"</ul>"+
        '<div class="slide-benefits">'+(benefits.length?benefits.map(b=>'<div class="sb-item">'+esc(b)+"</div>").join(""):"")+"</div>"+
      "</div>"+
      photoBlock+
      '<div class="slide-conclusion">'+esc(s.conclusion||"")+"</div>"+
    "</div>";
  }
```

- [ ] **Step 2: base.css 加入簡報照片樣式**

Modify `v4/css/base.css`：在 `.slide-page .slide-conclusion{…}` 規則（第 165 行）之後加入：
```css
.slide-page .slide-photos{display:flex;gap:14px;flex:1;min-height:0}
.slide-page .slide-photo{
  flex:1;min-width:0;border:1px solid rgba(255,255,255,.18);border-radius:10px;
  background:rgba(255,255,255,.06);padding:8px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;overflow:hidden;
}
.slide-page .slide-photo img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;display:block}
.slide-page .slide-photo-tag{font-size:11px;letter-spacing:.14em;color:#93C5FD;font-weight:600}
```

- [ ] **Step 3: 驗證語法與樣式**

Run: `node --check v4/js/templates/slide/index.js`
Expected: exit 0，無輸出。
重新讀取 `v4/css/base.css` 的簡報區段：新增 4 條規則括號平衡。

- [ ] **Step 4: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器）：
1. 上傳改善前/後照片 → 切到「一頁簡報」模板 → 簡報版面顯示兩張照片（改善前/改善後標籤、等比不壓扁）。
2. 只有單邊照片 → 該側顯示、另一側留空置中。
3. 清除照片 → 簡報維持純文字、版面正常填滿。
4. 點「生成一頁簡報」（有 API key）→ 文字填入且照片保留。
5. 列印/PDF 簡報含照片。

- [ ] **Step 5: Commit**

```bash
git add v4/js/templates/slide/index.js v4/css/base.css
git commit -m "feat(v4): 一頁簡報整合改善前後照片"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件三節（render→Step 1、CSS→Step 2、列印→Step 3 說明），驗收標準 1-5 對應 Step 4 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`.slide-photos/.slide-photo/.slide-photo-tag` 在 Step 1（render）與 Step 2（CSS）一致；`photosBefore[0]`/`photosAfter[0]` 一致；`previewDataUrl||dataUrl` 一致。
