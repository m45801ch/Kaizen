# 改善提案生成器 V4：照片恢復原比例按鈕 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

照片可拖曳右下角把手自由調整寬高（`dispW/dispH`），可能造成變形。本設計新增「一鍵恢復原比例」按鈕，讓照片尺寸回到**原圖比例**，但**保留目前位置**。

## 二、方案

修改 `v4/js/templates/shared.js`、`v4/js/document.js`、`v4/css/layout.css`（均小改動）。

### 1. 資料模型

照片物件已有自然尺寸 `w/h`（上傳時壓縮/讀取所得）與顯示尺寸 `dispW/dispH`（拖曳後）。不需新欄位；「恢復原比例」即重設 `dispW/dispH` 依 `w/h` 比例，保留 `dispX/dispY`。

### 2. `shared.js`：新增按鈕

每張照片縮圖在 `center-btn` 之後新增「恢復原比例」按鈕：
```js
'<button type="button" class="ratio-btn" data-reset-ratio="'+esc(p.id)+'" title="恢復原比例">⟲</button>'
```

### 3. `document.js`：點擊處理

在 `bindDocument` 的 click 委派（`[data-center]` 分支之後）新增 `[data-reset-ratio]` 分支：
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
（`dispX/dispY` 不變 → 位置保留；無 `w/h` 時 ratio=1 → 1:1 正方形。）

### 4. CSS：按鈕樣式

比照 `center-btn`（左上角圓形，hover 顯示），但放在 `center-btn` 下方避免重疊：
```css
.photo-thumb .ratio-btn{
  position:absolute;top:34px;left:6px;width:22px;height:22px;border-radius:50%;
  background:rgba(255,255,255,.9);color:var(--text);border:none;cursor:pointer;font-size:14px;line-height:1;
  display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .15s;box-shadow:var(--shadow-sm);
}
.photo-thumb:hover .ratio-btn{opacity:1}
.photo-thumb .ratio-btn:hover{color:var(--primary)}
```
列印時隱藏（加入 `@media print` 的 `display:none` 清單）。

## 三、不變項目

- 拖曳/縮放/置中/移除/編輯、位置記憶（dispX/dispY）、照片上傳、其他模板、列印機制不變。
- 資料結構只改 `dispW/dispH` 值，不新增欄位。

## 四、驗收標準

1. 照片拖曳變形後，點「恢復原比例」→ 尺寸回到原圖比例（寬 260、高依比例），位置保留。
2. 未變形的照片點按鈕 → 尺寸維持原比例。
3. 無 `w/h` 的照片（未壓縮上傳）→ 恢復為 1:1 正方形。
4. 刷新後尺寸保留（IndexedDB）。
5. 列印時按鈕不出現。
