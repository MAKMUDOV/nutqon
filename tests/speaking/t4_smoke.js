const { launch, waitFor } = require('./h');
(async()=>{ const {browser,page,errs}=await launch(); const R={};
 const views={home:"renderHome()",speak:"renderSpeak()",mock:"renderMock()",read:"renderSkill('reading')",listen:"renderSkill('listening')",write:"renderSkillList('writing')",vocab:"renderVocab()",rating:"renderRating()",myres:"renderMyRes()",topic:"openTopic(5)",fullmock:"renderFullMockIntro()"};
 for(const [k,js] of Object.entries(views)){ try{ await page.evaluate(js); await page.waitForTimeout(500); R[k]=await page.evaluate(()=>document.getElementById('app').innerText.length); }catch(e){ R[k]="ERR "+e.message.slice(0,100); } }
 // reading test start+finish
 try{ await page.evaluate(()=>{ const t=READING_MOCKS[0]; startTest(t.id); }); await page.waitForTimeout(400); R.readTest=await page.evaluate(()=>S.view); }catch(e){ R.readTest="ERR "+e.message; }
 // topic practice exam B1 via intro
 try{ await page.evaluate(()=>openTopic(3)); await page.waitForTimeout(300); R.topicExamIntro=await page.evaluate(()=>!!document.querySelector('[data-act="exstart"]')&&!!document.querySelector('[data-act="mictest"]')); }catch(e){ R.topicExamIntro="ERR "+e.message; }
 R.errs=errs; console.log(JSON.stringify(R)); await browser.close(); })();
