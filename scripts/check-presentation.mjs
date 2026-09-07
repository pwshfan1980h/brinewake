import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.argv[2] || 'http://127.0.0.1:4173/';
const out='docs/screenshots/presentation';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const evidence=[];
try {
 for(const level of [0,1,2]) {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Isolated saved-checkpoint fixtures for visual QA, not campaign-completion evidence.
  await page.addInitScript(({level})=>{
   localStorage.setItem('brinewake.checkpoint.v1',JSON.stringify({version:1,level,completed:0,x:4,y:1}));
  },{level});
  await page.goto(base+'?diagnostics');
  await page.getByRole('button',{name:'Continue from relay',exact:true}).click();
  await page.waitForFunction(()=>window.__BRINEWAKE__.snapshot().menu==='hidden');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#menu').evaluate(e=>getComputedStyle(e).display),'none');
  await page.screenshot({path:`${out}/chapter-${level+1}.png`});
  if(level===0){
   await page.keyboard.down('KeyD');await page.waitForTimeout(380);
   await page.screenshot({path:`${out}/walk.png`});await page.keyboard.up('KeyD');
   await page.mouse.move(1100,360);await page.keyboard.press('KeyE');
   await page.waitForFunction(()=>window.__BRINEWAKE__.snapshot().shots.some(s=>s.kind==='pod'));
   await page.screenshot({path:`${out}/missile.png`});
   await page.mouse.down({button:'right'});await page.waitForTimeout(600);await page.mouse.up({button:'right'});
   assert.equal((await page.evaluate(()=>window.__BRINEWAKE__.snapshot())).audio.state,'running');
  }
  const s=await page.evaluate(()=>window.__BRINEWAKE__.snapshot());
  evidence.push({fixture:true,level:s.level,errors,audio:s.audio,render:s.render});
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await writeFile(`${out}/evidence.json`,JSON.stringify(evidence,null,2));
 // Underwater visual fixture: exercise the real torpedo input, not a spawned effect.
 const water=await browser.newPage({viewport:{width:1440,height:900}});
 await water.addInitScript(()=>localStorage.setItem('brinewake.checkpoint.v1',JSON.stringify({version:1,level:0,completed:0,x:30,y:-3})));
 await water.goto(base+'?diagnostics');
 await water.getByRole('button',{name:'Continue from relay',exact:true}).click();
 await water.waitForFunction(()=>window.__BRINEWAKE__.snapshot().player.water==='submerged');
 await water.mouse.move(1100,500);await water.keyboard.press('KeyE');
 await water.waitForFunction(()=>window.__BRINEWAKE__.snapshot().shots.some(s=>s.kind==='pod'));
 await water.screenshot({path:`${out}/torpedo.png`});
 await water.close();
 console.log(JSON.stringify(evidence,null,2));
}finally {await browser.close();}
