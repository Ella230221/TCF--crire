const practiceTab = document.getElementById('practiceTab');
const templateTab = document.getElementById('templateTab');
const practicePanel = document.getElementById('practicePanel');
const templatePanel = document.getElementById('templatePanel');
const writingEditor = document.getElementById('writingEditor');
const templateEditor = document.getElementById('templateEditor');
const wordCount = document.getElementById('wordCount');
const wordRequirement = document.getElementById('wordRequirement');
const saveStatus = document.getElementById('saveStatus');
const resultsPanel = document.getElementById('resultsPanel');
const templateResult = document.getElementById('templateResult');
const grammarResult = document.getElementById('grammarResult');
const overallScore = document.getElementById('overallScore');
const storageKey = 'tcf-writing-practice-v1';

const lowerCharacters = ['à', 'â', 'ä', 'æ', 'ç', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'œ', 'ù', 'û', 'ü', 'ÿ'];
let uppercase = false;
let history = [''];
let historyIndex = 0;
let historyTimer;
let currentTask = '1';
const taskRanges = { '1': [60, 120], '2': [120, 150], '3': [150, 180] };
let taskDrafts = {
  '1': { writing: '', template: '' },
  '2': { writing: '', template: '' },
  '3': { writing: '', template: '' }
};

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
  const start = writingEditor.selectionStart;
  const end = writingEditor.selectionEnd;
  writingEditor.setRangeText(text, start, end, 'end');
  writingEditor.dispatchEvent(new Event('input', { bubbles: true }));
}

function updateStatus() {
  const count = getWords(writingEditor.value).length;
  const [minimum, maximum] = taskRanges[currentTask];
  wordCount.textContent = `${count} 词`;
  wordRequirement.textContent = `（Tâche ${currentTask} 参考：${minimum}–${maximum} 词，不限输入）`;
  wordCount.style.color = count >= minimum && count <= maximum ? '#16a34a' : '#f04400';
}

function saveDraft(showConfirmation = false) {
  taskDrafts[currentTask] = { writing: writingEditor.value, template: templateEditor.value };
  localStorage.setItem(storageKey, JSON.stringify({
    tasks: taskDrafts,
    currentTask
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
      taskDrafts[restoredTask] = { writing: saved.writing || '', template: saved.template || '' };
    }
    currentTask = restoredTask;
    writingEditor.value = taskDrafts[currentTask]?.writing || '';
    templateEditor.value = taskDrafts[currentTask]?.template || '';
    document.querySelectorAll('.task-button').forEach(button => {
      button.classList.toggle('is-active', button.dataset.task === currentTask);
    });
    history = [writingEditor.value];
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
  const writing = normalizeSentence(writingEditor.value);
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
  const suggestions = checkGrammar(writingEditor.value);
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
    writingEditor.value = taskDrafts[currentTask]?.writing || '';
    templateEditor.value = taskDrafts[currentTask]?.template || '';
    history = [writingEditor.value];
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
    if (history[history.length - 1] !== writingEditor.value) history.push(writingEditor.value);
    historyIndex = history.length - 1;
  }, 350);
});
templateEditor.addEventListener('input', () => saveDraft());
document.getElementById('saveBtn').addEventListener('click', () => saveDraft(true));
document.getElementById('submitBtn').addEventListener('click', submitWriting);
document.getElementById('undoBtn').addEventListener('click', () => {
  if (historyIndex <= 0) return;
  writingEditor.value = history[--historyIndex];
  updateStatus();
});
document.getElementById('redoBtn').addEventListener('click', () => {
  if (historyIndex >= history.length - 1) return;
  writingEditor.value = history[++historyIndex];
  updateStatus();
});

restoreDraft();
renderCharacters();
updateStatus();
