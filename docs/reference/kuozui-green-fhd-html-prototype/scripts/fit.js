
const BASE_W = 1920;
const BASE_H = 1080;
const canvas = document.getElementById('canvas');
function fitCanvas(){
  const vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const scale = Math.min(vw / BASE_W, vh / BASE_H);
  const left = Math.round((vw - BASE_W * scale) / 2);
  const top = Math.round((vh - BASE_H * scale) / 2);
  canvas.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
}
window.addEventListener('resize', fitCanvas, { passive:true });
if (window.visualViewport) window.visualViewport.addEventListener('resize', fitCanvas, { passive:true });
fitCanvas();
