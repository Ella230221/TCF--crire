(() => {
  const MAX_QUESTIONS = 500;
  const DB_NAME = 'tcf-t3-editor';
  const STORE_NAME = 'documents';
  const container = document.getElementById('t3ImportedQuestions');
  const input = document.getElementById('t3FileInput');
  const counter = document.getElementById('t3ImportCount');
  const moduleStorageKey = 'tcf-t3-editable-nodes-v2';
  if (!container || !input) return;
  const readyControls=[input,document.getElementById('t3AddQuestion'),document.getElementById('t3SaveImported'),document.getElementById('t3ClearImported')].filter(Boolean);
  readyControls.forEach(control=>control.disabled=true);

  const templatePatterns = [
    /Si je comprends bien, il s'agit de savoir si/gi,
    /Il serait intéressant de s'interroger sur les différents aspects de cette question/gi,
    /Pour ma part, je pense que/gi,
    /J'aimerais développer trois arguments qui expliquent mon point de vue/gi,
    /Pour commencer,/gi, /constitue un véritable atout, car/gi, /En effet,/gi,
    /Par exemple, j'ai entendu parler d'un sujet abordé dans Quotidien/gi,
    /Cela montre que/gi, /Ensuite,/gi, /joue également un rôle essentiel/gi,
    /Autrement dit,/gi, /Prenons l'exemple de/gi, /Cet exemple prouve que/gi,
    /Toutefois, j'aimerais ajouter un dernier point concernant/gi,
    /Même si/gi, /En définitive,/gi,
    /Il s'agit avant tout de prendre en considération l'ensemble des facteurs avant de se faire une opinion/gi
  ];

  function escapeHtml(text) { return text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function markTemplates(text) {
    let html = escapeHtml(text);
    templatePatterns.forEach(pattern => { html = html.replace(pattern, match => `<span class="auto-template">${match}</span>`); });
    return html.replace(/\n/g, '<br>');
  }
  function plainText(html) { const box=document.createElement('div'); box.innerHTML=html; return box.innerText.trim(); }
  function makeQuestion(data = {}) {
    const article = document.createElement('article');
    article.className = 't3-imported-card';
    article.dataset.id = data.id || `t3-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    article.innerHTML = `<div class="t3-card-head"><strong contenteditable="true" data-field="title">${escapeHtml(data.title || 'Nouvelle question')}</strong><button type="button" aria-label="Supprimer">×</button></div><div class="t3-card-editor" contenteditable="true" spellcheck="true" lang="fr">${data.html || markTemplates(data.text || '')}</div>`;
    article.querySelector('button').addEventListener('click',()=>{ if(confirm('Supprimer cette question ?')) { article.remove(); updateCount(); save(); }});
    article.addEventListener('input',()=>{ updateCount(); scheduleSave(); });
    article.addEventListener('paste',()=>setTimeout(()=>{ recolorCard(article); scheduleSave(); },0));
    container.appendChild(article);
    return article;
  }
  function recolorCard(card) {
    const editor = card.querySelector('.t3-card-editor');
    const selection = getSelection();
    const text = editor.innerText;
    editor.innerHTML = markTemplates(text);
    selection?.removeAllRanges();
  }
  function parseFile(text, type) {
    if (type.includes('json')) {
      try {
        const json=JSON.parse(text); const rows=Array.isArray(json)?json:(json.questions||[]);
        return rows.map((row,index)=>typeof row==='string'?{title:`Question ${index+1}`,text:row}:{title:row.title||row.question||`Question ${index+1}`,text:row.text||row.answer||row.content||''});
      } catch (_) { alert('Le fichier JSON est invalide.'); return []; }
    }
    if (type.includes('html')) { const box=document.createElement('div'); box.innerHTML=text; text=box.innerText; }
    const blocks=text.split(/\n\s*(?:={3,}|-{3,})\s*\n|\n{3,}/).map(v=>v.trim()).filter(Boolean);
    return blocks.map((block,index)=>{ const lines=block.split('\n'); const first=lines[0].trim(); const title=/\?$/.test(first)||/^(?:question\s*)?\d+[.):-]/i.test(first)?first:`Question ${index+1}`; return {title,text:title===first?lines.slice(1).join('\n').trim():block}; });
  }
  function serialize() { return [...container.querySelectorAll('.t3-imported-card')].slice(0,MAX_QUESTIONS).map(card=>({id:card.dataset.id,title:card.querySelector('[data-field="title"]').innerText.trim(),html:card.querySelector('.t3-card-editor').innerHTML,text:card.querySelector('.t3-card-editor').innerText.trim()})); }
  function updateCount() { counter.textContent=`${container.children.length} / ${MAX_QUESTIONS} questions`; }
  let timer;
  function scheduleSave(){ clearTimeout(timer); timer=setTimeout(save,500); }
  function openDb(){ return new Promise((resolve,reject)=>{ const request=indexedDB.open(DB_NAME,1); request.onupgradeneeded=()=>request.result.createObjectStore(STORE_NAME); request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error); }); }
  async function save(){ const data=serialize(); try{const db=await openDb(); const tx=db.transaction(STORE_NAME,'readwrite'); tx.objectStore(STORE_NAME).put(data,'questions');}catch(_){localStorage.setItem('tcf-t3-imported-v1',JSON.stringify(data));} }
  async function restore(){ let data=[]; try{const db=await openDb(); data=await new Promise(resolve=>{const request=db.transaction(STORE_NAME).objectStore(STORE_NAME).get('questions');request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);});}catch(_){try{data=JSON.parse(localStorage.getItem('tcf-t3-imported-v1'))||[];}catch(_){}} container.innerHTML=''; data.slice(0,MAX_QUESTIONS).forEach(makeQuestion); updateCount();readyControls.forEach(control=>control.disabled=false);window.dispatchEvent(new Event('t3editorready')); }

  input.addEventListener('change',async event=>{ for(const file of [...event.target.files]) { const remaining=MAX_QUESTIONS-container.children.length; if(remaining<=0) break; const rows=parseFile(await file.text(),file.type||file.name.split('.').pop()); rows.slice(0,remaining).forEach(makeQuestion); } updateCount(); await save(); input.value=''; });
  document.getElementById('t3AddQuestion').addEventListener('click',()=>{ if(container.children.length>=MAX_QUESTIONS)return alert('La limite est de 500 questions.'); makeQuestion(); updateCount(); save(); });
  document.getElementById('t3SaveImported').addEventListener('click',async()=>{ container.querySelectorAll('.t3-imported-card').forEach(recolorCard); await save(); alert('Les modifications sont enregistrées.'); });
  document.getElementById('t3ClearImported').addEventListener('click',()=>{ if(confirm('Supprimer toutes les questions importées ?')) { container.innerHTML=''; updateCount(); save(); }});

  const editableNodes=[...document.querySelectorAll('main .section p, main .section li, main .section h3')].filter(node=>!node.closest('.t3-import-panel'));
  editableNodes.forEach((node,index)=>{node.contentEditable='true';node.dataset.editKey=`edit-${index}`;});
  try {
    const edits=JSON.parse(localStorage.getItem(moduleStorageKey))||{};
    editableNodes.forEach(node=>{if(Object.prototype.hasOwnProperty.call(edits,node.dataset.editKey))node.innerHTML=edits[node.dataset.editKey];});
  } catch (_) {}
  let moduleTimer;
  document.querySelector('main').addEventListener('input',event=>{
    if(event.target.closest('.t3-import-panel')) return;
    clearTimeout(moduleTimer);
    moduleTimer=setTimeout(()=>{
      const edits={};
      editableNodes.forEach(node=>{edits[node.dataset.editKey]=node.innerHTML;});
      try{localStorage.setItem(moduleStorageKey,JSON.stringify(edits));}catch(_){alert("L'espace de stockage du navigateur est plein.");}
    },600);
  });
  restore();
})();
