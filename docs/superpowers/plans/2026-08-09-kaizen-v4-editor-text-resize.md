# V4 文字右下角縮放把手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 文字選取後在右下角新增縮放把手，拖曳時按比例縮放字體大小（6–300px）。

**Architecture:** 在 `drawSelection` 文字分支（旋轉座標空間內）繪製右下角方塊把手；`startSelect` 用與旋轉把手相同的旋轉公式偵測右下角把手（優先於旋轉把手）；`selectMove` 新增 `tsize` 模式，以「錨點到拖曳點距離的比例」等比縮放 `o.size`。

**Tech Stack:** 純 ES Modules（無建置工具、無測試框架）；僅改 `v4/js/editor/editor.js`。

## Global Constraints

- 本專案無測試框架；驗證方式為「本機伺服器開啟 v4/index.html + 手動操作瀏覽器」。ES Modules 在 `file://` 下有 CORS 限制，必須用本機伺服器。
- 縮放：`newSize = baseSize * (dist / startDist)`，`Math.round`，夾在 6–300px；`startDist > 0` 才計算。
- 錨點為文字左上 `(o.x,o.y)`；距離以目前畫面座標計算（與 `overlay.rotate`/`crop` 無關，旋轉後拖曳仍正常）。
- 縮放把手優先於旋轉把手偵測。
- 旋轉把手、移動、其他物件操作、還原邏輯、`drawOverlay`/`renderComposite` 繪製輸出不動；字體滑桿（12–96px）照常可用。
- 檔案編碼 UTF-8；不得加入無關程式碼。

---

### Task 1: 文字右下角縮放把手

**Files:**
- Modify: `v4/js/editor/editor.js`（`drawSelection`、`startSelect`、`selectMove`）

**Interfaces:**
- Consumes: `selected`/`selDrag`、`textRect`、`selObj`（既有）。
- Produces: `selDrag={mode:"tsize",pushed:true,baseSize,startDist}`；`selectMove` 的 `tsize` 分支改 `o.size`。

- [ ] **Step 1: `drawSelection` 文字分支加右下角把手**

Modify `v4/js/editor/editor.js`：將目前 `drawSelection` 的文字分支（第 219-227 行）
```js
  if(selected.type==="text"){
    const r=textRect(o);
    ctx.save();
    ctx.translate(o.x,o.y);
    ctx.rotate(((o.angle||0)*Math.PI/180));
    ctx.strokeRect(0,0,r.w,r.h);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(r.w/2,-20/editing.scale,4/editing.scale,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
```
替換為：
```js
  if(selected.type==="text"){
    const r=textRect(o);
    ctx.save();
    ctx.translate(o.x,o.y);
    ctx.rotate(((o.angle||0)*Math.PI/180));
    ctx.strokeRect(0,0,r.w,r.h);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(r.w/2,-20/editing.scale,4/editing.scale,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle="#fff";
    ctx.fillRect(r.w-4/editing.scale, r.h-4/editing.scale, 8/editing.scale, 8/editing.scale);
    ctx.strokeRect(r.w-4/editing.scale, r.h-4/editing.scale, 8/editing.scale, 8/editing.scale);
    ctx.restore();
  }
```

- [ ] **Step 2: `startSelect` 文字分支加縮放把手偵測**

Modify `v4/js/editor/editor.js`：將目前 `startSelect` 的文字分支（第 322-328 行）
```js
      if(selected.type==="text"){
        const r=textRect(o);
        const a=(o.angle||0)*Math.PI/180;
        const ox=r.w/2, oy=-20/editing.scale;
        const hx=o.x+ox*Math.cos(a)-oy*Math.sin(a);
        const hy=o.y+ox*Math.sin(a)+oy*Math.cos(a);
        if(Math.hypot(p.x-hx,p.y-hy)<T){ pushUndo(); selDrag={mode:"rotate",pushed:true,baseAngle:o.angle||0,startAngle:Math.atan2(p.y-o.y,p.x-o.x)}; redraw(); return; }
      }
```
替換為：
```js
      if(selected.type==="text"){
        const r=textRect(o);
        const a=(o.angle||0)*Math.PI/180;
        const cos=Math.cos(a), sin=Math.sin(a);
        const rox=r.w/2, roy=-20/editing.scale;
        const hx=o.x+rox*cos-roy*sin;
        const hy=o.y+rox*sin+roy*cos;
        const rx=o.x+r.w*cos-r.h*sin;
        const ry=o.y+r.w*sin+r.h*cos;
        if(Math.hypot(p.x-rx,p.y-ry)<T){ pushUndo(); selDrag={mode:"tsize",pushed:true,baseSize:o.size||32,startDist:Math.hypot(p.x-o.x,p.y-o.y)}; redraw(); return; }
        if(Math.hypot(p.x-hx,p.y-hy)<T){ pushUndo(); selDrag={mode:"rotate",pushed:true,baseAngle:o.angle||0,startAngle:Math.atan2(p.y-o.y,p.x-o.x)}; redraw(); return; }
      }
```

- [ ] **Step 3: `selectMove` 新增 `tsize` 模式**

Modify `v4/js/editor/editor.js`：在 `selectMove` 的 rotate 分支（`} else if(selDrag.mode==="rotate"){ ... }`）之後、`resize` 分支之前插入：
```js
    } else if(selDrag.mode==="tsize"){
      const dist=Math.hypot(p.x-o.x, p.y-o.y);
      if(selDrag.startDist>0){
        o.size=Math.max(6, Math.min(300, Math.round(selDrag.baseSize*dist/selDrag.startDist)));
      }
    }
```

- [ ] **Step 4: 驗證語法**

Run: `node --check v4/js/editor/editor.js`
Expected: exit 0，無輸出。

- [ ] **Step 5: 手動驗證**

開啟 `http://localhost:8123/v4/index.html`（需先啟動伺服器），上傳照片後開編輯器：
1. 用文字工具輸入文字 → 切到選擇工具選取 → 右下角出現方塊縮放把手（上方仍為旋轉圓點把手）。
2. 拖曳右下角把手向外 → 字變大；向內 → 字變小（等比）。
3. 先旋轉文字再拖縮放把手 → 仍正常。
4. 點「完成」後縮圖字體大小正確。
5. 拖縮放後按一次「還原」→ 字體回到拖曳前大小。

- [ ] **Step 6: Commit**

```bash
git add v4/js/editor/editor.js
git commit -m "feat(v4): 文字右下角縮放把手（等比調整字體大小）"
```

---

## Self-Review 結果

1. **Spec 覆蓋率**：設計文件二節（drawSelection 加把手→Step 1、startSelect 偵測→Step 2、selectMove tsize→Step 3），驗收標準 1-5 對應 Step 5 手動驗證。無遺漏。
2. **Placeholder 掃描**：無 TBD；每個 code step 皆含完整程式碼。
3. **型別一致性**：`selDrag.mode==="tsize"`、`baseSize`、`startDist` 在 Step 2（產生）與 Step 3（消費）一致；右下角位置 `(r.w,r.h)` 在 Step 1（繪製）與 Step 2（偵測）用相同的旋轉公式一致。
