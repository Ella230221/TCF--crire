const textDialog = document.getElementById('textDialog');
const introEditor = document.getElementById('introEditor');
const introTitle = document.getElementById('introTitle');
const sentenceList = document.getElementById('sentenceList');
const emptyState = document.getElementById('emptyState');
const template = document.getElementById('sentenceTemplate');
const voiceSelect = document.getElementById('voiceSelect');
const rateSelect = document.getElementById('rateSelect');
const storageKey = 'tcf-t1-introduction-v1';
let sentences = [];
let currentIndex = 0;
let voices = [];
let mediaRecorder = null;
let activeStream = null;
let readingAll = false;
let isPaused = false;
const recordings = new Map();
const practiced = new Set();
let practiceMode = 'listen';

function splitSentences(text) {
  return (text.replace(/\r/g, '').match(/[^.!?…\n]+(?:[.!?…]+|$)/g) || [])
    .map(sentence => sentence.trim()).filter(Boolean);
}

function loadVoices() {
  voices = speechSynthesis.getVoices();
  const french = voices.filter(voice => /^fr/i.test(voice.lang));
  const available = french.length ? french : voices;
  voiceSelect.innerHTML = '';
  available.forEach(voice => {
    const option = document.createElement('option');
    option.value = voices.indexOf(voice);
    option.textContent = `${voice.name} · ${voice.lang}${voice.localService ? '' : ' · Cloud'}`;
    voiceSelect.appendChild(option);
  });
  const preferred = available.find(voice => /amel|audrey|thomas|premium|natural/i.test(voice.name));
  if (preferred) voiceSelect.value = voices.indexOf(preferred);
}

function selectedVoice() { return voices[Number(voiceSelect.value)] || voices.find(voice => /^fr/i.test(voice.lang)); }

function speakSentence(index, continueAfter = false) {
  if (!sentences[index]) return;
  if (!continueAfter) readingAll = false;
  speechSynthesis.cancel();
  currentIndex = index;
  markActive(index);
  document.getElementById('playbackStatus').textContent = `朗读中 ${index + 1}/${sentences.length}`;
  const utterance = new SpeechSynthesisUtterance(sentences[index]);
  utterance.lang = 'fr-FR';
  utterance.rate = Number(rateSelect.value);
  utterance.voice = selectedVoice() || null;
  utterance.onend = () => {
    if (continueAfter && readingAll && index < sentences.length - 1) {
      speakSentence(index + 1, true);
    } else if (continueAfter && index === sentences.length - 1) {
      readingAll = false;
      document.getElementById('playbackStatus').textContent = '全文朗读完成';
    }
  };
  speechSynthesis.speak(utterance);
}

function markActive(index) {
  document.querySelectorAll('.sentence-card').forEach((card, cardIndex) => card.classList.toggle('is-active', cardIndex === index));
  document.querySelectorAll('.reader-sentence').forEach((span, spanIndex) => span.classList.toggle('is-reading', spanIndex === index));
  const target = practiceMode === 'listen' ? document.querySelectorAll('.reader-sentence')[index] : document.querySelectorAll('.sentence-card')[index];
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function render() {
  sentenceList.innerHTML = '';
  const continuousText = document.getElementById('continuousText');
  continuousText.innerHTML = '';
  emptyState.hidden = Boolean(sentences.length);
  sentences.forEach((sentence, index) => {
    const readerSentence = document.createElement('span');
    readerSentence.className = 'reader-sentence';
    readerSentence.textContent = `${sentence} `;
    readerSentence.addEventListener('click', () => speakSentence(index));
    continuousText.appendChild(readerSentence);
    const card = template.content.firstElementChild.cloneNode(true);
    card.querySelector('.sentence-number').textContent = index + 1;
    card.querySelector('.sentence-text').textContent = sentence;
    card.querySelector('.speak-button').addEventListener('click', () => speakSentence(index));
    card.querySelector('.record-button').addEventListener('click', event => toggleRecording(index, event.currentTarget, card));
    card.querySelector('.replay-button').addEventListener('click', () => {
      const url = recordings.get(index); if (url) new Audio(url).play();
    });
    card.querySelector('.compare-button').addEventListener('click', () => recognizeSentence(index, card));
    sentenceList.appendChild(card);
  });
  applyPracticeMode();
  updateStats();
}

function applyPracticeMode() {
  const hasText = Boolean(sentences.length);
  document.getElementById('continuousReader').hidden = !hasText || practiceMode !== 'listen';
  sentenceList.hidden = !hasText || practiceMode !== 'repeat';
  document.querySelectorAll('#practiceModeTabs button').forEach(button => button.classList.toggle('is-active', button.dataset.mode === practiceMode));
}

function switchPracticeMode(mode) {
  practiceMode = mode;
  readingAll = false;
  speechSynthesis.cancel();
  applyPracticeMode();
}

async function toggleRecording(index, button, card) {
  if (mediaRecorder?.state === 'recording') { mediaRecorder.stop(); return; }
  try {
    activeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const chunks = [];
    mediaRecorder = new MediaRecorder(activeStream);
    mediaRecorder.ondataavailable = event => chunks.push(event.data);
    mediaRecorder.onstop = () => {
      const oldUrl = recordings.get(index); if (oldUrl) URL.revokeObjectURL(oldUrl);
      recordings.set(index, URL.createObjectURL(new Blob(chunks, { type: mediaRecorder.mimeType })));
      activeStream.getTracks().forEach(track => track.stop());
      button.textContent = '● 开始录音'; button.classList.remove('is-recording');
      card.querySelector('.replay-button').disabled = false;
      practiced.add(index); card.classList.add('is-complete'); updateProgress();
    };
    mediaRecorder.start(); button.textContent = '■ 停止录音'; button.classList.add('is-recording');
  } catch (_) { alert('无法使用麦克风。请允许浏览器访问麦克风；本地文件受限时请使用 GitHub 在线页面。'); }
}

function normalize(text) { return text.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zœæ' ]/g,' ').replace(/\s+/g,' ').trim(); }
function similarity(expected, actual) {
  const target = normalize(expected).split(' ').filter(Boolean); const heard = new Set(normalize(actual).split(' ').filter(Boolean));
  return target.length ? Math.round(target.filter(word => heard.has(word)).length / target.length * 100) : 0;
}

function missingWords(expected, actual) {
  const heard = new Set(normalize(actual).split(' ').filter(Boolean));
  return [...new Set(normalize(expected).split(' ').filter(word => word.length > 1 && !heard.has(word)))];
}

function recognizeSentence(index, card) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { alert('当前浏览器不支持语音识别。建议使用最新版 Chrome 或 Edge。'); return; }
  const button = card.querySelector('.compare-button'); const resultBox = card.querySelector('.comparison');
  const recognition = new Recognition(); recognition.lang = 'fr-FR'; recognition.interimResults = false;
  button.textContent = '● 正在聆听…'; button.classList.add('is-recording');
  recognition.onresult = event => {
    const heard = event.results[0][0].transcript; const score = similarity(sentences[index], heard);
    const missing = missingWords(sentences[index], heard);
    const correction = missing.length
      ? `<div><strong>请重点纠正或重读：</strong><div class="correction-words">${missing.map(word => `<span>${escapeHtml(word)}</span>`).join('')}</div></div>`
      : '<div><strong>识别完整，没有发现明显漏读词。</strong></div>';
    resultBox.hidden = false; resultBox.innerHTML = `<strong>识别结果（${score}%）：</strong>${escapeHtml(heard)}${correction}`;
    const scoreBox = card.querySelector('.sentence-score'); scoreBox.textContent = `${score}%`; scoreBox.className = `sentence-score ${score >= 80 ? 'good' : 'medium'}`;
    practiced.add(index); card.classList.add('is-complete'); updateProgress();
  };
  recognition.onerror = event => { resultBox.hidden = false; resultBox.textContent = `识别失败：${event.error}`; };
  recognition.onend = () => { button.textContent = '◎ 发音识别'; button.classList.remove('is-recording'); };
  recognition.start();
}

function escapeHtml(text) { return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function updateStats() {
  const text = sentences.join(' '); document.getElementById('characterCount').textContent = `${text.length} 字符`;
  document.getElementById('sentenceCount').textContent = `${sentences.length} 句`;
  document.getElementById('estimatedTime').textContent = `约 ${Math.max(1, Math.ceil(text.split(/\s+/).length / 125))} 分钟`;
  updateProgress();
}
function updateProgress() {
  const percentage = sentences.length ? Math.round(practiced.size / sentences.length * 100) : 0;
  document.getElementById('progressValue').textContent = `${percentage}%`;
  document.getElementById('progressRing').style.setProperty('--progress', `${percentage * 3.6}deg`);
  document.getElementById('sentenceProgress').textContent = `${practiced.size} / ${sentences.length}`;
}
function saveIntroduction() {
  sentences = splitSentences(introEditor.value); document.querySelector('.document-head h1').textContent = introTitle.value || '我的法语自我介绍';
  localStorage.setItem(storageKey, JSON.stringify({ title: introTitle.value, text: introEditor.value })); practiced.clear(); render(); textDialog.close();
}
function openEditor() { textDialog.showModal(); setTimeout(() => introEditor.focus(), 50); }

document.getElementById('newTextBtn').addEventListener('click', openEditor);
document.getElementById('emptyAddBtn').addEventListener('click', openEditor);
document.getElementById('libraryBtn').addEventListener('click', openEditor);
document.getElementById('saveTextBtn').addEventListener('click', saveIntroduction);
introEditor.addEventListener('input', () => document.getElementById('dialogCount').textContent = `${introEditor.value.length} 字符`);
document.getElementById('fileInput').addEventListener('change', async event => { const file = event.target.files[0]; if (!file) return; introEditor.value = await file.text(); document.getElementById('dialogCount').textContent = `${introEditor.value.length} 字符`; openEditor(); });
document.getElementById('playAllBtn').addEventListener('click', () => {
  if (!sentences.length) { openEditor(); return; }
  practiceMode = 'listen'; applyPracticeMode();
  readingAll = true; isPaused = false; speechSynthesis.cancel(); speakSentence(0, true);
  document.getElementById('pauseBtn').textContent = 'Ⅱ';
});
document.getElementById('continuousPlayBtn').addEventListener('click', () => {
  if (!sentences.length) return;
  practiceMode = 'listen'; applyPracticeMode(); readingAll = true; isPaused = false; speechSynthesis.cancel(); speakSentence(0, true);
});
document.querySelectorAll('#practiceModeTabs button').forEach(button => button.addEventListener('click', () => switchPracticeMode(button.dataset.mode)));
document.getElementById('pauseBtn').addEventListener('click', event => {
  if (!speechSynthesis.speaking) return;
  if (isPaused) { speechSynthesis.resume(); isPaused = false; event.currentTarget.textContent = 'Ⅱ'; document.getElementById('playbackStatus').textContent = `继续朗读 ${currentIndex + 1}/${sentences.length}`; }
  else { speechSynthesis.pause(); isPaused = true; event.currentTarget.textContent = '▶'; document.getElementById('playbackStatus').textContent = `已暂停 ${currentIndex + 1}/${sentences.length}`; }
});
document.getElementById('stopBtn').addEventListener('click', () => { readingAll = false; isPaused = false; speechSynthesis.cancel(); document.getElementById('playbackStatus').textContent = '已停止'; document.getElementById('pauseBtn').textContent = 'Ⅱ'; });
document.getElementById('previousBtn').addEventListener('click', () => speakSentence(Math.max(0, currentIndex - 1)));
document.getElementById('nextBtn').addEventListener('click', () => speakSentence(Math.min(sentences.length - 1, currentIndex + 1)));
speechSynthesis.onvoiceschanged = loadVoices; loadVoices();
try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (saved) { introTitle.value = saved.title || ''; introEditor.value = saved.text || ''; sentences = splitSentences(introEditor.value); document.querySelector('.document-head h1').textContent = saved.title || '我的法语自我介绍'; render(); } } catch (_) {}
