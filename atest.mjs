import { chromium } from 'playwright-core'
const URL='http://localhost:3000'; const errors=[]; const audioPlays=[]
const b = await chromium.launch({ executablePath: process.env.PW_EXE, args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] })
const p = await b.newPage({ viewport:{width:1280,height:900} })
p.on('pageerror', e=>errors.push(e.message))
// track audio play() calls
await p.addInitScript(() => {
  const orig = window.HTMLMediaElement.prototype.play
  window.__played = []
  window.HTMLMediaElement.prototype.play = function(){ window.__played.push(this.currentSrc || this.src); return orig.apply(this, arguments) }
})
await p.goto(URL,{waitUntil:'networkidle'})
await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear() })
await p.goto(URL,{waitUntil:'networkidle'})
await p.waitForTimeout(800)
// splash present?
const splash = await p.$('#welcome-splash')
console.log('welcome splash shown:', !!splash)
// tap to enter
await p.click('#welcome-splash')
await p.waitForTimeout(1200)
const playedAfterEnter = await p.evaluate(()=>window.__played.slice())
console.log('audio played after tap:', JSON.stringify(playedAfterEnter.map(s=>s.split('/').pop())))
// splash gone?
await p.waitForTimeout(600)
const splashGone = await p.$('#welcome-splash')
console.log('splash removed after tap:', !splashGone)
// login -> after-login voice
await p.waitForSelector('#auth-form')
await p.fill('input[name=email]','aarav@campus.edu'); await p.fill('input[name=password]','student123')
await p.click('#auth-submit'); await p.waitForSelector('#page-title'); await p.waitForTimeout(1200)
const playedAfterLogin = await p.evaluate(()=>window.__played.slice())
console.log('all audio played (incl after login):', JSON.stringify(playedAfterLogin.map(s=>s.split('/').pop())))
await b.close()
console.log('JS ERRORS:', errors.length); errors.forEach(e=>console.log('  '+e))
console.log('DONE')
