/* 三頁籤側欄切換 */
export function initSidebar(){
  document.querySelectorAll(".tab-btn").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      const target=document.getElementById("tab-"+btn.dataset.tab);
      if(target) target.classList.add("active");
    });
  });
}
