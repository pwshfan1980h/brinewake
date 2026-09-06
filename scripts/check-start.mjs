import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],timeout:15000});
try {
  const page = await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:4173');
  await page.getByRole('button',{name:'Begin rescue',exact:true}).click();
  await page.waitForTimeout(500);
  assert.equal(await page.locator('#menu').evaluate(e=>getComputedStyle(e).display),'none','Begin rescue must hide the title overlay');
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Resume rescue',exact:true}).click();
  assert.equal(await page.locator('#menu').evaluate(e=>getComputedStyle(e).display),'none','Resume must hide the pause overlay');
  assert.deepEqual(errors,[]);
  console.log('PASS: Begin rescue and pause/resume hide overlays; no page errors');
} finally { await browser.close(); }
