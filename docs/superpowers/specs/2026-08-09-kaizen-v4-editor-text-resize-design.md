# 改善提案生成器 V4：文字右下角縮放把手 設計文件

日期：2026-08-09
狀態：已與使用者確認

## 一、背景與目標

V4 圖片編輯器選擇工具下，文字選取後只有旋轉把手（上方中心），**無法用滑鼠拖曳改變文字大小**。本設計新增**右下角縮放把手**，拖曳時按比例縮放字體大小（拖得越遠字越大、越近越小）。

## 二、方案

修改 `v4/js/editor/editor.js`（僅此一檔）：

### 1. `drawSelection` 文字分支加縮放把手

目前文字分支（在旋轉座標空間內）：
```js
    ctx.strokeRect(0,0,r.w,r.h);
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(r.w/2,-20/editing.scale,4/editing.scale,0,Math.PI*2); ctx.stroke();
    ctx.restore();
```
在其後、`ctx.restore()` 之前加入右下角方塊把手：
```js
    ctx.fillStyle="#fff";
    ctx.fillRect(r.w-4/editing.scale, r.h-4/editing.scale, 8/editing.scale, 8/editing.scale);
    ctx.strokeRect(r.w-4/editing.scale, r.h-4/editing.scale, 8/editing.scale, 8/editing.scale);
```
（在旋轉座標空間內，`(r.w, r.h)` 即文字框右下角；把手為實心白底＋藍色外框方塊，與圖框把手一致。）

### 2. `startSelect` 文字分支加縮放把手偵測

目前文字分支（第 322-328 行附近）：
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
改為（加入縮放把手偵測，用同樣的旋轉公式把本地右下角 `(r.w,r.h)` 轉到世界座標）：
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
（縮放把手優先於旋轉把手偵測；`startDist`＝錨點 `(o.x,o.y)` 到按下點的距離。）

### 3. `selectMove` 新增 `tsize` 模式

目前 `selectMove` 的 rotate 分支後加入：
```js
    } else if(selDrag.mode==="tsize"){
      const dist=Math.hypot(p.x-o.x, p.y-o.y);
      if(selDrag.startDist>0){
        o.size=Math.max(6, Math.min(300, Math.round(selDrag.baseSize*dist/selDrag.startDist)));
      }
    }
```
（等比縮放：`newSize = baseSize * (目前距錨點距離 / 按下時距離)`，四捨五入，夾在 6–300px。錨點為文字左上 `(o.x,o.y)`，距離以目前畫面座標計算，與旋轉無關，故旋轉後拖曳仍正常。）

## 三、不變項目

- 旋轉把手、文字移動、其他物件（圖框/箭頭/塗鴉）操作、還原邏輯、`drawOverlay`/`renderComposite` 繪製輸出都不動。
- 字體大小滑桿（12–96px）仍可正常使用（與拖曳把手並存；拖曳把手範圍較廣 6–300px）。

## 四、驗收標準

1. 文字選取後右下角出現縮放把手。
2. 拖曳把手向外＝字變大、向內＝字變小（等比、比例縮放）。
3. 文字旋轉後拖曳縮放仍正常（座標正確）。
4. 完成後輸出（縮圖/列印）字體大小正確。
5. 一次縮放操作可按一次還原退一步。
