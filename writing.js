const practiceTab = document.getElementById('practiceTab');
const templateTab = document.getElementById('templateTab');
const practicePanel = document.getElementById('practicePanel');
const templatePanel = document.getElementById('templatePanel');
const writingEditor = document.getElementById('writingEditor');
const writingTitle = document.getElementById('writingTitle');
const templateEditor = document.getElementById('templateEditor');
const wordCount = document.getElementById('wordCount');
const wordRequirement = document.getElementById('wordRequirement');
const saveStatus = document.getElementById('saveStatus');
const resultsPanel = document.getElementById('resultsPanel');
const templateResult = document.getElementById('templateResult');
const grammarResult = document.getElementById('grammarResult');
const overallScore = document.getElementById('overallScore');
const storageKey = 'tcf-writing-practice-v1';
const writingLibraryKey = 'tcf-writing-library-v1';
const maxWritingLibrarySize = 500;
let writingLibrary = [];
let activeWritingIds = { '1': null, '2': null, '3': null };

const lowerCharacters = ['à', 'â', 'ä', 'æ', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'œ', 'ù', 'û', 'ü', 'ÿ'];
let uppercase = false;
let history = [''];
let historyIndex = 0;
let historyTimer;
let currentTask = '1';
const taskRanges = { '1': [60, 120], '2': [120, 150], '3': [150, 180] };
let taskDrafts = {
  '1': { title:'', writing: '', writingHtml:'', template: '' },
  '2': { title:'', writing: '', writingHtml:'', template: '' },
  '3': { title:'', writing: '', writingHtml:'', template: '' }
};

function writingText(){ return writingEditor.innerText.replace(/\u00a0/g,' ').trim(); }
function setWritingContent(draft={}){ writingTitle.value=draft.title||''; writingEditor.innerHTML=draft.writingHtml||escapeHtml(draft.writing||'').replace(/\n/g,'<br>'); }

function getWords(text) {
  return text.trim().match(/[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ'-]+/g) || [];
}

function switchTab(tab) {
  const practiceActive = tab === 'practice';
  practiceTab.classList.toggle('is-active', practiceActive);
  templateTab.classList.toggle('is-active', !practiceActive);
  practiceTab.setAttribute('aria-selected', String(practiceActive));
  templateTab.setAttribute('aria-selected', String(!practiceActive));
  practicePanel.hidden = !practiceActive;
  templatePanel.hidden = practiceActive;
  practicePanel.classList.toggle('is-active', practiceActive);
  templatePanel.classList.toggle('is-active', !practiceActive);
}

function renderCharacters() {
  const container = document.getElementById('characterButtons');
  container.innerHTML = '';
  lowerCharacters.forEach(character => {
    const button = document.createElement('button');
    const displayedCharacter = uppercase ? character.toLocaleUpperCase('fr') : character;
    button.type = 'button';
    button.textContent = displayedCharacter;
    button.addEventListener('click', () => insertAtCursor(displayedCharacter));
    container.appendChild(button);
  });
}

function insertAtCursor(text) {
  writingEditor.focus();
  document.execCommand('insertText', false, text);
  writingEditor.dispatchEvent(new Event('input', { bubbles: true }));
}

function updateStatus() {
  const count = getWords(writingText()).length;
  const [minimum, maximum] = taskRanges[currentTask];
  wordCount.textContent = `${count} 词`;
  wordRequirement.textContent = `（Tâche ${currentTask} 参考：${minimum}–${maximum} 词，不限输入）`;
  wordCount.style.color = count >= minimum && count <= maximum ? '#16a34a' : '#f04400';
}

function saveDraft(showConfirmation = false) {
  taskDrafts[currentTask] = { title:writingTitle.value, writing:writingText(), writingHtml:writingEditor.innerHTML, template: templateEditor.value };
  localStorage.setItem(storageKey, JSON.stringify({
    tasks: taskDrafts,
    currentTask,
    activeWritingIds
  }));
  saveStatus.textContent = showConfirmation ? '已保存' : '草稿已自动保存';
  if (showConfirmation) setTimeout(() => { saveStatus.textContent = '草稿已自动保存'; }, 1300);
}

function restoreDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved) return;
    const restoredTask = saved.currentTask || '1';
    if (saved.tasks) {
      taskDrafts = { ...taskDrafts, ...saved.tasks };
    } else {
      taskDrafts[restoredTask] = { title:'', writing: saved.writing || '', writingHtml:'', template: saved.template || '' };
    }
    currentTask = restoredTask;
    setWritingContent(taskDrafts[currentTask]);
    templateEditor.value = taskDrafts[currentTask]?.template || '';
    document.querySelectorAll('.task-button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.task === currentTask);
    });
    activeWritingIds={...activeWritingIds,...(saved.activeWritingIds||{})};
    history = [writingEditor.innerHTML];
  } catch (_) {}
}

function normalizeSentence(sentence) {
  return sentence.toLocaleLowerCase('fr').replace(/[^a-zà-öø-ÿœæ' ]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function extractTemplateSentences(text) {
  return text.split(/(?<=[.!?])\s+/).map(sentence => sentence.trim()).filter(sentence => getWords(sentence).length >= 4);
}

function compareTemplate() {
  const templateSentences = extractTemplateSentences(templateEditor.value);
  if (!templateSentences.length) {
    return { score: 0, html: '<p>请先在“范文模板”中录入需要对照的模板。</p>' };
  }
  const writing = normalizeSentence(writingText());
  const checks = templateSentences.map(sentence => {
    const normalized = normalizeSentence(sentence);
    const keyWords = getWords(normalized).filter(word => word.length > 3);
    const matched = keyWords.filter(word => writing.includes(word)).length;
    const ratio = keyWords.length ? matched / keyWords.length : 0;
    return { sentence, matched: ratio >= .65 };
  });
  const matchedCount = checks.filter(check => check.matched).length;
  const score = Math.round(matchedCount / checks.length * 100);
  const missing = checks.filter(check => !check.matched);
  const missingHtml = missing.length
    ? `<p>可能缺少的模板句：</p><ul class="missing-list">${missing.map(item => `<li>${escapeHtml(item.sentence)}</li>`).join('')}</ul>`
    : '<p class="success">模板固定结构已完整覆盖。</p>';
  return { score, html: `<strong>${score}% 匹配</strong><div class="progress"><span style="width:${score}%"></span></div>${missingHtml}` };
}

function checkGrammar(text) {
  const suggestions = [];
  const add = (title, detail) => suggestions.push({ title, detail });
  if (!text.trim()) add('尚未输入文章', '请先完成写作再提交。');
  if (/\s{2,}/.test(text)) add('多余空格', '文章中存在连续空格，建议改为一个空格。');
  if (/\s+[,.!?;:]/.test(text)) add('标点前空格', '逗号、句号等标点前通常不应出现普通空格。');
  if (/(^|[.!?]\s+)[a-zà-öø-ÿ]/.test(text)) add('句首大写', '部分句子可能没有使用大写字母开头。');
  if (text.trim() && !/[.!?…]$/.test(text.trim())) add('句末标点', '文章最后一句缺少句号或其他结束标点。');
  if (/\bje ([aeiouéèêëàâîïôùûü])/i.test(text)) add('省音形式', "元音或哑音 h 前通常使用 j’，例如 j’aime、j’habite。");
  if (/\bde le\b/i.test(text)) add('缩合冠词', '“de le”通常应缩合为“du”。');
  if (/\bà le\b/i.test(text)) add('缩合冠词', '“à le”通常应缩合为“au”。');
  if (/\bde les\b/i.test(text)) add('缩合冠词', '“de les”通常应缩合为“des”。');
  if (/\bà les\b/i.test(text)) add('缩合冠词', '“à les”通常应缩合为“aux”。');
  if (/\bsi je serais\b/i.test(text)) add('Si 条件句', '“si je serais”通常应根据语义改为“si j’étais”或“si je pouvais”等未完成过去时。');
  if (/\bmalgré que\b/i.test(text)) add('连接表达', '正式写作中建议用“bien que + 虚拟式”或“malgré + 名词”。');
  if (/\bbeaucoup des\b/i.test(text)) add('数量表达', '泛指时通常使用“beaucoup de”；特指时才可能使用“beaucoup des”。');
  const repeated = getWords(text.toLocaleLowerCase('fr')).filter((word, index, words) => word.length > 3 && word === words[index - 1]);
  if (repeated.length) add('重复词', `发现可能重复的词：“${[...new Set(repeated)].join('、')}”。`);
  return suggestions;
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function submitWriting() {
  const comparison = compareTemplate();
  const suggestions = checkGrammar(writingText());
  const grammarScore = Math.max(0, 100 - suggestions.length * 10);
  const finalScore = Math.round(comparison.score * .45 + grammarScore * .55);
  templateResult.innerHTML = comparison.html;
  grammarResult.innerHTML = suggestions.length
    ? suggestions.map(item => `<div class="suggestion"><strong>${item.title}</strong><div>${item.detail}</div></div>`).join('')
    : '<p class="success">基础检查暂未发现明显问题。建议再人工检查动词变位、阴阳性和冠词。</p>';
  overallScore.textContent = `${finalScore}%`;
  resultsPanel.hidden = false;
  resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  saveDraft();
}

function saveWritingToLibrary(showConfirmation=true){
  const text=writingText();
  if(!text){if(showConfirmation)alert('请先输入写作内容。');return;}
  const activeId=activeWritingIds[currentTask];
  const existing=writingLibrary.find(item=>item.id===activeId);
  const title=writingTitle.value.trim()||`Tâche ${currentTask} — ${text.slice(0,36)}`;
  const data={id:existing?.id||`writing-${Date.now()}-${Math.random().toString(16).slice(2)}`,task:currentTask,title,text,html:writingEditor.innerHTML,template:templateEditor.value,wordCount:getWords(text).length,createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()};
  if(existing)writingLibrary[writingLibrary.indexOf(existing)]=data;else writingLibrary.push(data);
  writingLibrary=writingLibrary.sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,maxWritingLibrarySize);
  activeWritingIds[currentTask]=data.id;writingTitle.value=title;
  localStorage.setItem(writingLibraryKey,JSON.stringify(writingLibrary));saveDraft();renderWritingLibrary();
  if(showConfirmation)alert('已保存到写作练习库。');
}

function loadWriting(item){
  saveDraft();currentTask=String(item.task);activeWritingIds[currentTask]=item.id;
  writingTitle.value=item.title;writingEditor.innerHTML=item.html||escapeHtml(item.text).replace(/\n/g,'<br>');templateEditor.value=item.template||'';
  document.querySelectorAll('.task-button').forEach(button=>button.classList.toggle('is-active',button.dataset.task===currentTask));
  history=[writingEditor.innerHTML];historyIndex=0;updateStatus();saveDraft();document.querySelector('.editor-card').scrollIntoView({behavior:'smooth'});
}

function renderWritingLibrary(){
  const list=document.getElementById('savedWritingList');const mode=document.getElementById('writingSort').value;
  const items=[...writingLibrary].sort((a,b)=>mode==='oldest'?a.createdAt-b.createdAt:mode==='task'?Number(a.task)-Number(b.task)||b.updatedAt-a.updatedAt:mode==='title'?a.title.localeCompare(b.title,'zh'):b.updatedAt-a.updatedAt);
  if(!items.length){list.innerHTML='<div class="writing-library-empty">还没有保存的写作练习。</div>';return;}
  list.innerHTML=items.map((item,index)=>`<article class="saved-writing-card" data-id="${item.id}"><h3>${index+1}. ${escapeHtml(item.title)}</h3><p>Tâche ${item.task} · ${item.wordCount} 词 · ${new Date(item.updatedAt).toLocaleString('zh-CN')}</p><div class="saved-writing-preview">${escapeHtml(item.text)}</div><div class="saved-writing-actions"><button class="load-writing" type="button">载入继续编辑</button><button class="delete-writing" type="button">删除</button></div></article>`).join('');
  list.querySelectorAll('.saved-writing-card').forEach(card=>{const item=writingLibrary.find(entry=>entry.id===card.dataset.id);card.querySelector('.load-writing').onclick=()=>loadWriting(item);card.querySelector('.delete-writing').onclick=()=>{if(confirm('确定删除这篇写作吗？')){writingLibrary=writingLibrary.filter(entry=>entry.id!==item.id);if(activeWritingIds[item.task]===item.id)activeWritingIds[item.task]=null;localStorage.setItem(writingLibraryKey,JSON.stringify(writingLibrary));saveDraft();renderWritingLibrary();}};});
}

practiceTab.addEventListener('click', () => switchTab('practice'));
templateTab.addEventListener('click', () => switchTab('template'));
document.getElementById('caseToggle').addEventListener('click', event => {
  uppercase = !uppercase;
  event.currentTarget.textContent = uppercase ? '大写' : '小写';
  renderCharacters();
});

document.querySelectorAll('.task-button').forEach(button => {
  button.addEventListener('click', () => {
    saveDraft();
    currentTask = button.dataset.task;
    setWritingContent(taskDrafts[currentTask]);
    templateEditor.value = taskDrafts[currentTask]?.template || '';
    history = [writingEditor.innerHTML];
    historyIndex = 0;
    document.querySelectorAll('.task-button').forEach(item => item.classList.toggle('is-active', item === button));
    updateStatus();
    saveDraft();
  });
});

writingEditor.addEventListener('input', () => {
  updateStatus();
  saveDraft();
  clearTimeout(historyTimer);
  historyTimer = setTimeout(() => {
    history = history.slice(0, historyIndex + 1);
    if (history[history.length - 1] !== writingEditor.innerHTML) history.push(writingEditor.innerHTML);
    historyIndex = history.length - 1;
  }, 350);
});
templateEditor.addEventListener('input', () => saveDraft());
writingTitle.addEventListener('input',()=>saveDraft());
document.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('mousedown',event=>event.preventDefault()));
document.querySelectorAll('[data-color]').forEach(button=>button.addEventListener('click',()=>{writingEditor.focus();document.execCommand('foreColor',false,button.dataset.color);writingEditor.dispatchEvent(new Event('input',{bubbles:true}));}));
document.getElementById('newWritingBtn').addEventListener('click',()=>{if(writingText()&&!confirm('新建文章会清空当前编辑区，已保存的文章不会删除。继续吗？'))return;activeWritingIds[currentTask]=null;writingTitle.value='';writingEditor.innerHTML='';taskDrafts[currentTask]={...taskDrafts[currentTask],title:'',writing:'',writingHtml:''};history=[''];historyIndex=0;updateStatus();saveDraft();writingEditor.focus();});
document.getElementById('saveBtn').addEventListener('click', () => saveWritingToLibrary(true));
document.getElementById('writingSort').addEventListener('change',renderWritingLibrary);
window.addEventListener('studyannotationchange',()=>{saveDraft();if(activeWritingIds[currentTask])saveWritingToLibrary(false);});
document.getElementById('submitBtn').addEventListener('click', submitWriting);
document.getElementById('undoBtn').addEventListener('click', () => {
  if (historyIndex <= 0) return;
  writingEditor.innerHTML = history[--historyIndex];
  updateStatus();
});
document.getElementById('redoBtn').addEventListener('click', () => {
  if (historyIndex >= history.length - 1) return;
  writingEditor.innerHTML = history[++historyIndex];
  updateStatus();
});

restoreDraft();
try{writingLibrary=JSON.parse(localStorage.getItem(writingLibraryKey))||[];}catch(_){writingLibrary=[];}
renderCharacters();
updateStatus();
renderWritingLibrary();
