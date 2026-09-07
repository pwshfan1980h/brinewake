import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.addInitScript(()=>localStorage.setItem('brinewake.checkpoint.v1',JSON.stringify({version:1,level:0,completed:0,x:50,y:1})));
 await page.goto((process.argv[2]||'http://127.0.0.1:4173/')+'?diagnostics');
 await page.getByRole('button',{name:'Continue from relay',exact:true}).click();
 await page.waitForSelector('.objective-label');
 const samples=await page.evaluate(()=>new Promise(resolve=>{
  const samples=[];let n=0;
  const key=(code,type)=>dispatchEvent(new KeyboardEvent(type,{code,bubbles:true}));
  key('KeyD','keydown');
  function frame(){
   const state=window.__BRINEWAKE__.snapshot();
   const o=state.objectives[0];
   const e=Array.from(document.querySelectorAll('.objective-label')).find(e=>e.textContent.toLowerCase().includes(o.name.toLowerCase()));
   if(e){const r=e.getBoundingClientRect(),p=window.__BRINEWAKE__.screen(o.x,o.y+2.8);samples.push(Math.hypot(r.left+r.width/2-p.x,r.bottom-p.y));}
   if(++n===35){key('KeyD','keyup');key('KeyA','keydown');}
   if(n<70)requestAnimationFrame(frame);else{key('KeyA','keyup');resolve(samples);}
  }requestAnimationFrame(frame);
 }));
 const maximum=Math.max(...samples);
 console.log(JSON.stringify({samples:samples.length,maxAnchorErrorPixels:maximum}));
 assert(samples.length>=60,'must sample moving-camera labels');
 assert(maximum<1,'World label must remain within one pixel of its anchor on every rendered frame');
}finally{await browser.close();}
