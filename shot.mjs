import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: process.env.PW_EXE, args:['--no-sandbox'] })
const p = await b.newPage({ viewport:{width:1280,height:900} })
await p.goto('http://localhost:3000',{waitUntil:'networkidle'})
await p.evaluate(()=>{ localStorage.clear(); sessionStorage.clear() })
await p.goto('http://localhost:3000',{waitUntil:'networkidle'})
await p.waitForSelector('#welcome-splash'); await p.waitForTimeout(700)
await p.screenshot({path:'splash.png'})
await b.close(); console.log('shot done')
