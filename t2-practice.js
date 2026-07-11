const topicZh = document.getElementById('practiceTopicZh');
const topicFr = document.getElementById('practiceTopicFr');
const questionsEditor = document.getElementById('practiceQuestions');
const referenceHints = document.getElementById('referenceHints');
const gptEndpoint = document.getElementById('gptEndpoint');
const practiceStorageKey = 'tcf-t2-practice-v1';

function getQuestions() { return questionsEditor.value.split(/\n+/).map(q => q.trim()).filter(Boolean); }
function escapePracticeHtml(text) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normalizePractice(text) { return text.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zœæ' ]/g,' ').replace(/\s+/g,' ').trim(); }

function updateQuestionCount() { document.getElementById('practiceQuestionCount').textContent = `${getQuestions().length} 个问题`; savePractice(); }
function savePractice() { localStorage.setItem(practiceStorageKey,JSON.stringify({zh:topicZh.value,fr:topicFr.value,questions:questionsEditor.value,endpoint:gptEndpoint.value})); }

function reviewQuestion(question) {
  const issues = []; let correction = question.trim();
  if (!/[?？]$/.test(correction)) { issues.push('缺少问号'); correction = correction.replace(/[.。!！]*$/,'') + ' ?'; }
  if (/\b(de le)\b/i.test(correction)) { issues.push('de le 应缩合为 du'); correction = correction.replace(/\bde le\b/gi,'du'); }
  if (/\b(à le)\b/i.test(correction)) { issues.push('à le 应缩合为 au'); correction = correction.replace(/\bà le\b/gi,'au'); }
  if (/\b(de les)\b/i.test(correction)) { issues.push('de les 应缩合为 des'); correction = correction.replace(/\bde les\b/gi,'des'); }
  if (/\b(à les)\b/i.test(correction)) { issues.push('à les 应缩合为 aux'); correction = correction.replace(/\bà les\b/gi,'aux'); }
  if (/\bsi\s+[^?]+\b(serait|pourrait|aurait)\b/i.test(correction)) issues.push('si 条件从句通常不用条件式，请检查时态');
  if (/\bquel est-ce que\b/i.test(correction)) issues.push('疑问结构不自然，建议使用 quel/quelle + 名词或 qu’est-ce que');
  if (correction.split(/\s+/).length < 3) issues.push('问题过短，可能缺少明确询问对象');
  const hasQuestionShape = /^(qui|que|qu'|quoi|où|ou |quand|comment|combien|pourquoi|quel|quelle|quels|quelles|est-ce|avez|êtes|etes|pouvez|pourriez|y a-t-il|faut-il|dois-je|peut-on|est-il|est-elle|sont-ils|sont-elles|as-tu|avez-vous)/i.test(correction) || /-(il|elle|ils|elles|tu|vous)\s*\?/i.test(correction);
  if (!hasQuestionShape) issues.push('请检查疑问词、est-ce que 或主谓倒装结构');
  return {question,correction,issues,score:Math.max(35,100-issues.length*18)};
}

function localEvaluation() {
  const questions = getQuestions();
  if (!topicFr.value.trim() && !topicZh.value.trim()) { alert('请先输入题目。'); return; }
  if (!questions.length) { alert('请至少输入一个要练习的问题。'); return; }
  const reviews = questions.map(reviewQuestion);
  const normalized = reviews.map(r=>normalizePractice(r.question));
  reviews.forEach((review,index)=>{ if(normalized.indexOf(normalized[index])!==index){ review.issues.push('与前面的问题重复'); review.score=Math.max(30,review.score-20); }});
  const average = Math.round(reviews.reduce((sum,r)=>sum+r.score,0)/reviews.length);
  const variety = new Set(reviews.map(r=>normalizePractice(r.question).split(' ')[0])).size;
  const overall = Math.round(average*.8+Math.min(100,variety*15)*.2);
  referenceHints.innerHTML = `<div class="score-summary"><div class="score-circle">${overall}</div><div class="score-details"><strong>基础检查 ${overall}/100</strong><span>${questions.length} 个问题 · ${variety} 种疑问角度</span></div></div>${reviews.map((r,i)=>`<div class="question-review ${r.issues.length?'needs-work':'is-good'}"><b>${i+1}. ${escapePracticeHtml(r.question)}</b><p>${r.issues.length?escapePracticeHtml(r.issues.join('；')):'结构基本正确，可继续练习语音和追问。'}</p>${r.correction!==r.question?`<p class="correction">建议：${escapePracticeHtml(r.correction)}</p>`:''}</div>`).join('')}<p class="reference-empty">基础评分只检查明显结构。点击“GPT 深度评分”可进一步判断切题度和地道程度。</p>`;
}

function buildGptPrompt() {
  return `你是TCF Canada口语Tâche 2法语考官。请根据题目审核考生准备的所有问题。逐题判断：1.是否切题；2.语法是否正确；3.是否自然地道；4.更好的法语改写；5.可继续追问的方向。最后给出100分总分、覆盖度和缺失角度。\n\n中文题意：${topicZh.value}\n法语原题：${topicFr.value}\n考生问题：\n${getQuestions().map((q,i)=>`${i+1}. ${q}`).join('\n')}`;
}

async function gptEvaluation() {
  const endpoint = gptEndpoint.value.trim();
  if (!endpoint) { alert('尚未配置安全代理地址。可以先点击“复制给 ChatGPT”，或在代理设置中填写服务端地址。'); return; }
  const button = document.getElementById('gptEvaluateBtn'); button.disabled=true; button.textContent='GPT 正在评分…';
  try { const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topicZh:topicZh.value,topicFr:topicFr.value,questions:getQuestions()})}); if(!response.ok) throw new Error(`HTTP ${response.status}`); const data=await response.json(); referenceHints.innerHTML=`<div class="question-review is-good"><b>GPT 深度评分</b><p>${escapePracticeHtml(data.result||data.output||JSON.stringify(data)).replace(/\n/g,'<br>')}</p></div>`; document.getElementById('gptStatus').textContent='GPT 已连接'; }
  catch(error){ alert(`GPT 连接失败：${error.message}。已保留本地评分和复制提示功能。`); }
  finally { button.disabled=false; button.textContent='✦ GPT 深度评分'; }
}

document.getElementById('localEvaluateBtn').addEventListener('click',localEvaluation);
document.getElementById('gptEvaluateBtn').addEventListener('click',gptEvaluation);
document.getElementById('copyGptPromptBtn').addEventListener('click',async()=>{ try{await navigator.clipboard.writeText(buildGptPrompt()); alert('完整评分提示已复制，可以直接粘贴到 ChatGPT。');}catch(_){prompt('请复制以下内容：',buildGptPrompt());} });
[topicZh,topicFr,questionsEditor,gptEndpoint].forEach(element=>element.addEventListener('input',updateQuestionCount));
try{const saved=JSON.parse(localStorage.getItem(practiceStorageKey));if(saved){topicZh.value=saved.zh||'';topicFr.value=saved.fr||'';questionsEditor.value=saved.questions||'';gptEndpoint.value=saved.endpoint||'';}}catch(_){} updateQuestionCount();
