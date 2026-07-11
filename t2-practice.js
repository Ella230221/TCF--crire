const topicFr = document.getElementById('practiceTopicFr');
const questionsEditor = document.getElementById('practiceQuestions');
const referenceHints = document.getElementById('referenceHints');
const gptEndpoint = document.getElementById('gptEndpoint');
const practiceStorageKey = 'tcf-t2-practice-v1';
const practiceLibraryKey = 'tcf-t2-practice-library-v1';
let lastPracticeScore = null;
let practiceLibrary = [];
let activePracticeId = null;
let autoUpdateTimer = null;

const expressionToggle = document.getElementById('expressionNavToggle');
const expressionLinks = Array.from(document.querySelectorAll('.side-nav .toc-link:not(.t2-main-link)'));
const expressionGroup = document.createElement('div');
expressionGroup.className = 'expression-nav-items';
if (expressionLinks.length) {
  expressionLinks[0].before(expressionGroup);
  expressionLinks.forEach(link => expressionGroup.appendChild(link));
}
expressionToggle?.addEventListener('click', () => {
  const collapsed = expressionGroup.classList.toggle('is-collapsed');
  expressionToggle.textContent = collapsed ? '›' : '⌄';
  expressionToggle.setAttribute('aria-expanded', String(!collapsed));
  expressionToggle.setAttribute('aria-label', collapsed ? '展开表达积累栏目' : '收起表达积累栏目');
});

function positionExpressionToggle() {
  const expressionLink = document.querySelector('.t2-main-link[href="#expression-library"]');
  if (expressionToggle && expressionLink) expressionToggle.style.top = `${expressionLink.offsetTop + 7}px`;
}

function getDialogueText() { return questionsEditor.innerText.replace(/\u00a0/g,' ').trim(); }
function getConversationLines() { return getDialogueText().split(/\n+/).map(line => line.trim()).filter(Boolean); }
function getQuestions() { return getConversationLines().filter(line => /[?？]/.test(line)); }
function getInteractionLines() { return getConversationLines().filter(line => !/[?？]/.test(line)); }
function escapePracticeHtml(text) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normalizePractice(text) { return text.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zœæ' ]/g,' ').replace(/\s+/g,' ').trim(); }

function updateQuestionCount() { document.getElementById('practiceQuestionCount').textContent = `${getQuestions().length} 个问题 · ${getInteractionLines().length} 句互动表达`; savePractice(); if(activePracticeId){clearTimeout(autoUpdateTimer);autoUpdateTimer=setTimeout(()=>saveToPracticeLibrary(true),450);} }
function savePractice() { localStorage.setItem(practiceStorageKey,JSON.stringify({fr:topicFr.value,questions:getDialogueText(),dialogueHtml:questionsEditor.innerHTML,endpoint:gptEndpoint.value,activePracticeId})); }

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
  if (!topicFr.value.trim()) { alert('请先输入题目。'); return; }
  if (!questions.length) { alert('请至少输入一个要练习的问题。'); return; }
  const reviews = questions.map(reviewQuestion);
  const normalized = reviews.map(r=>normalizePractice(r.question));
  reviews.forEach((review,index)=>{ if(normalized.indexOf(normalized[index])!==index){ review.issues.push('与前面的问题重复'); review.score=Math.max(30,review.score-20); }});
  const average = Math.round(reviews.reduce((sum,r)=>sum+r.score,0)/reviews.length);
  const variety = new Set(reviews.map(r=>normalizePractice(r.question).split(' ')[0])).size;
  const interactionLines = getInteractionLines();
  const fullDialogue = normalizePractice(getDialogueText());
  const hasGreeting = /\b(bonjour|salut|bonsoir)\b/.test(fullDialogue);
  const hasPoliteness = /\b(merci|s'il vous plait|s'il te plait|je vous remercie)\b/.test(fullDialogue);
  const hasReaction = /\b(je vois|d'accord|ah bon|c'est interessant|je comprends|parfait|tres bien)\b/.test(fullDialogue);
  const hasTransition = /\b(et |alors|ensuite|a propos|justement|concernant|sinon)\b/.test(fullDialogue);
  const conversationScore = Math.min(100, 35 + interactionLines.length*10 + (hasGreeting?15:0) + (hasPoliteness?15:0) + (hasReaction?15:0) + (hasTransition?10:0));
  const overall = Math.round(average*.62+Math.min(100,variety*15)*.13+conversationScore*.25);
  lastPracticeScore = overall;
  const flowSuggestions = [!hasGreeting&&'建议加入自然开场',!hasPoliteness&&'可以加入感谢或礼貌表达',!hasReaction&&'回答后加入 Je vois / D’accord 等真实回应',!hasTransition&&'使用 Alors / Ensuite / Et concernant…衔接追问',interactionLines.length<2&&'不要连续只问问题，可穿插解释和回应'].filter(Boolean);
  referenceHints.innerHTML = `<div class="score-summary"><div class="score-circle">${overall}</div><div class="score-details"><strong>综合对话 ${overall}/100</strong><span>问题 ${average} · 自然互动 ${conversationScore}</span></div></div><div class="question-review ${flowSuggestions.length?'needs-work':'is-good'}"><b>对话自然度</b><p>${flowSuggestions.length?escapePracticeHtml(flowSuggestions.join('；')):'已有开场、礼貌表达、回应和过渡，整体交流比较自然。'}</p></div>${reviews.map((r,i)=>`<div class="question-review ${r.issues.length?'needs-work':'is-good'}"><b>${i+1}. ${escapePracticeHtml(r.question)}</b><p>${r.issues.length?escapePracticeHtml(r.issues.join('；')):'结构基本正确，可继续练习语音和追问。'}</p>${r.correction!==r.question?`<p class="correction">建议：${escapePracticeHtml(r.correction)}</p>`:''}</div>`).join('')}<p class="reference-empty">基础评分同时检查问题和对话结构。GPT 深度评分会进一步分析每句回应与上下文是否自然。</p>`;
  saveToPracticeLibrary(true);
}

function practiceTitle() {
  return (topicFr.value.trim() || '未命名真题').split(/\n/)[0].slice(0,70);
}

function persistPracticeLibrary() { localStorage.setItem(practiceLibraryKey, JSON.stringify(practiceLibrary)); }

function saveToPracticeLibrary(automatic = false) {
  if (!topicFr.value.trim()) { if (!automatic) alert('请先输入题目。'); return; }
  const signature = normalizePractice(topicFr.value);
  const existing = practiceLibrary.find(item => item.id === activePracticeId) || practiceLibrary.find(item => item.signature === signature);
  const data = { id: existing?.id || activePracticeId || `practice-${Date.now()}`, signature, title: practiceTitle(), fr: topicFr.value, questions:getDialogueText(), dialogueHtml:questionsEditor.innerHTML, score: lastPracticeScore, favorite: existing?.favorite || false, updatedAt: Date.now(), createdAt: existing?.createdAt || Date.now() };
  if (existing) practiceLibrary[practiceLibrary.indexOf(existing)] = data; else practiceLibrary.push(data);
  activePracticeId = data.id;
  persistPracticeLibrary(); renderPracticeLibrary();
  if (!automatic) alert('真题已保存到练习库。');
}

function renderPracticeLibrary() {
  const container = document.getElementById('savedPracticeList');
  const mode = document.getElementById('practiceSort').value;
  const items = [...practiceLibrary].sort((a,b) => mode === 'oldest' ? a.createdAt-b.createdAt : mode === 'title' ? a.title.localeCompare(b.title,'zh') : mode === 'score' ? (b.score??-1)-(a.score??-1) : mode === 'favorite' ? Number(b.favorite)-Number(a.favorite)||b.updatedAt-a.updatedAt : b.updatedAt-a.updatedAt);
  renderSavedPracticeNav(items);
  if (!items.length) { container.innerHTML = '<div class="library-empty">还没有保存的真题。完成第一次评分后会自动出现在这里。</div>'; return; }
  container.innerHTML = items.map((item,index) => `<article class="saved-practice-card ${item.favorite?'is-favorite':''}" data-id="${item.id}"><div class="saved-card-top"><h4><span class="practice-index">${index+1}.</span> ${escapePracticeHtml(item.title)}</h4><button class="favorite-button" type="button" title="收藏">★</button></div><p>${new Date(item.updatedAt).toLocaleString('zh-CN')} · ${item.questions.split(/\n+/).filter(Boolean).length} 句对话</p>${item.score==null?'':`<span class="saved-score">${item.score} 分</span>`}<div class="saved-card-actions"><button class="load-practice" type="button">载入练习</button><button class="delete-practice" type="button">删除</button></div></article>`).join('');
  container.querySelectorAll('.saved-practice-card').forEach(card => {
    const item = practiceLibrary.find(entry => entry.id === card.dataset.id);
    card.querySelector('.load-practice').addEventListener('click', () => loadSavedPractice(item));
    card.querySelector('.favorite-button').addEventListener('click', () => { item.favorite=!item.favorite; persistPracticeLibrary(); renderPracticeLibrary(); });
    card.querySelector('.delete-practice').addEventListener('click', () => { if(confirm('确定删除这条真题练习吗？')) { practiceLibrary=practiceLibrary.filter(entry=>entry.id!==item.id); if(activePracticeId===item.id) activePracticeId=null; persistPracticeLibrary(); savePractice(); renderPracticeLibrary(); } });
  });
}

function loadSavedPractice(item) {
  topicFr.value = item.fr;
  questionsEditor.innerHTML = item.dialogueHtml || escapePracticeHtml(item.questions).replace(/\n/g,'<br>');
  activePracticeId = item.id;
  lastPracticeScore = item.score;
  updateQuestionCount();
  document.getElementById('t2-real-practice').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSavedPracticeNav(items = practiceLibrary) {
  const nav = document.getElementById('savedPracticeNav');
  nav.hidden = !items.length;
  if (!items.length) { nav.innerHTML = ''; positionExpressionToggle(); return; }
  nav.innerHTML = `<div class="saved-practice-nav-title">已保存真题</div>${items.map((item,index) => `<button type="button" data-id="${item.id}" class="${item.favorite?'is-favorite':''}" title="${escapePracticeHtml(item.title)}"><b>${index+1}.</b> ${escapePracticeHtml(item.title)}${item.score==null?'':` <small>${item.score}</small>`}</button>`).join('')}`;
  nav.querySelectorAll('button[data-id]').forEach(button => {
    button.addEventListener('click', () => {
      const item = practiceLibrary.find(entry => entry.id === button.dataset.id);
      if (item) loadSavedPractice(item);
    });
  });
  positionExpressionToggle();
}

function buildGptPrompt() {
  return `你是TCF Canada口语Tâche 2法语考官。请根据题目审核考生准备的完整对话，而不只是判断问句。检查：1.问题是否切题；2.每句话语法是否正确；3.开场、解释、回应、过渡和追问是否自然；4.对话是否像真人交流而不是连续审问；5.逐句提供更地道的法语改写；6.给出可继续追问的方向。最后给出100分总分、问题覆盖度、互动自然度和缺失角度。\n\n法语原题：${topicFr.value}\n考生完整对话：\n${getConversationLines().map((line,i)=>`${i+1}. ${line}`).join('\n')}`;
}

async function gptEvaluation() {
  const endpoint = gptEndpoint.value.trim();
  if (!endpoint) { alert('尚未配置安全代理地址。可以先点击“复制给 ChatGPT”，或在代理设置中填写服务端地址。'); return; }
  const button = document.getElementById('gptEvaluateBtn'); button.disabled=true; button.textContent='GPT 正在评分…';
  try { const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topicFr:topicFr.value,questions:getQuestions(),conversation:getConversationLines()})}); if(!response.ok) throw new Error(`HTTP ${response.status}`); const data=await response.json(); referenceHints.innerHTML=`<div class="question-review is-good"><b>GPT 深度评分</b><p>${escapePracticeHtml(data.result||data.output||JSON.stringify(data)).replace(/\n/g,'<br>')}</p></div>`; document.getElementById('gptStatus').textContent='GPT 已连接'; saveToPracticeLibrary(true); }
  catch(error){ alert(`GPT 连接失败：${error.message}。已保留本地评分和复制提示功能。`); }
  finally { button.disabled=false; button.textContent='✦ GPT 深度评分'; }
}

document.getElementById('localEvaluateBtn').addEventListener('click',localEvaluation);
document.getElementById('gptEvaluateBtn').addEventListener('click',gptEvaluation);
document.getElementById('copyGptPromptBtn').addEventListener('click',async()=>{ try{await navigator.clipboard.writeText(buildGptPrompt()); alert('完整评分提示已复制，可以直接粘贴到 ChatGPT。');}catch(_){prompt('请复制以下内容：',buildGptPrompt());} });
document.getElementById('savePracticeBtn').addEventListener('click',()=>saveToPracticeLibrary(false));
document.getElementById('practiceSort').addEventListener('change',renderPracticeLibrary);
[topicFr,questionsEditor,gptEndpoint].forEach(element=>element.addEventListener('input',updateQuestionCount));
window.addEventListener('studyannotationchange',()=>{savePractice();if(activePracticeId)saveToPracticeLibrary(true);});
try{const saved=JSON.parse(localStorage.getItem(practiceStorageKey));if(saved){topicFr.value=saved.fr||'';questionsEditor.innerHTML=saved.dialogueHtml||escapePracticeHtml(saved.questions||'').replace(/\n/g,'<br>');gptEndpoint.value=saved.endpoint||'';activePracticeId=saved.activePracticeId||null;}}catch(_){} try{practiceLibrary=JSON.parse(localStorage.getItem(practiceLibraryKey))||[];}catch(_){practiceLibrary=[];} if(activePracticeId&&!practiceLibrary.some(item=>item.id===activePracticeId))activePracticeId=null; updateQuestionCount(); renderPracticeLibrary();
