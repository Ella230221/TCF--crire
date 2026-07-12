(() => {
  const key = `tcf-study-annotations:${location.pathname}`;
  let records = [];
  let activeTextControl = null;
  document.querySelectorAll('textarea,input[type="text"]').forEach(control => {
    control.addEventListener('focus', () => { activeTextControl = control; });
    control.addEventListener('select', () => { activeTextControl = control; });
  });

  const tools = document.createElement('div');
  tools.className = 'top-study-actions';
  tools.setAttribute('aria-label','高亮与批注工具');
  tools.innerHTML = `<button class="yellow" data-action="yellow" type="button" title="黄色高亮">🟨 <span>高亮</span></button><button class="green" data-action="green" type="button" title="绿色高亮">🟩 <span>高亮</span></button><button data-action="note" type="button" title="插入批注">✎ <span>批注</span></button><button data-action="clear-highlights" type="button" title="清除高亮">⌫ <span>高亮</span></button><button data-action="clear-notes" type="button" title="清除批注">⌫ <span>批注</span></button><div class="study-tools__list" hidden></div>`;
  document.querySelector('.site-switcher')?.appendChild(tools);
  const list = tools.querySelector('.study-tools__list');

  function persist() { localStorage.setItem(key, JSON.stringify(records)); }
  function selectionInfo() {
    if (activeTextControl && document.activeElement === activeTextControl) {
      const quote = activeTextControl.value.slice(activeTextControl.selectionStart, activeTextControl.selectionEnd).trim();
      if (quote) return { quote, control: activeTextControl };
    }
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.rangeCount) return { quote: selection.toString().trim(), range: selection.getRangeAt(0), selection };
    return null;
  }
  function annotate(type) {
    const info = selectionInfo();
    if (!info?.quote) { alert('请先选中需要高亮或添加备注的文字。'); return; }
    let note = '';
    if (type === 'note') { note = prompt('请输入备注内容：') || ''; if (!note) return; }
    const id = `annotation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    if (info.range) {
      const span = document.createElement('span');
      span.className = `study-highlight-${type}`; span.dataset.studyAnnotation = id;
      if (type === 'note') { span.dataset.studyNote = note; span.title = note; }
      try { info.range.surroundContents(span); } catch (_) { alert('请选择同一段落内的连续文字。'); return; }
      info.selection.removeAllRanges();
    } else if (info.control) { info.control.classList.add('study-textarea-marked'); }
    records.push({ id, type, quote: info.quote, note, time: Date.now() }); persist(); render(); window.dispatchEvent(new CustomEvent('studyannotationchange'));
  }
  function render() {
    if (!records.length) { list.innerHTML = '<div class="study-tools__empty">选中文字后即可高亮或添加备注</div>'; return; }
    list.innerHTML = records.slice().reverse().map(record => `<article class="study-note-item ${record.type}" data-id="${record.id}"><q>${escapeHtml(record.quote)}</q>${record.note?`<p>${escapeHtml(record.note)}</p>`:''}<button type="button" aria-label="删除">×</button></article>`).join('');
    list.querySelectorAll('.study-note-item').forEach(item => {
      item.addEventListener('click', event => { if(event.target.tagName==='BUTTON') return; document.querySelector(`[data-study-annotation="${item.dataset.id}"]`)?.scrollIntoView({behavior:'smooth',block:'center'}); });
      item.querySelector('button').addEventListener('click', () => removeRecord(item.dataset.id));
    });
  }
  function removeRecord(id) {
    const mark = document.querySelector(`[data-study-annotation="${id}"]`);
    if (mark) { mark.replaceWith(...mark.childNodes); }
    records = records.filter(record => record.id !== id); persist(); render(); window.dispatchEvent(new CustomEvent('studyannotationchange'));
  }
  function clearAll() {
    if (!records.length || confirm('确定清除本页所有高亮和备注吗？')) {
      document.querySelectorAll('[data-study-annotation]').forEach(mark => mark.replaceWith(...mark.childNodes));
      document.querySelectorAll('.study-textarea-marked').forEach(control => control.classList.remove('study-textarea-marked'));
      records = []; persist(); render(); window.dispatchEvent(new CustomEvent('studyannotationchange'));
    }
  }
  function clearType(type) {
    const ids=records.filter(record=>type==='note'?record.type==='note':record.type!=='note').map(record=>record.id);
    ids.forEach(id=>{const mark=document.querySelector(`[data-study-annotation="${id}"]`);if(mark)mark.replaceWith(...mark.childNodes);});
    records=records.filter(record=>type==='note'?record.type!=='note':record.type==='note');
    persist();render();window.dispatchEvent(new CustomEvent('studyannotationchange'));
  }
  function restoreMarks() {
    records.forEach(record => {
      if (document.querySelector(`[data-study-annotation="${record.id}"]`)) return;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!node.nodeValue.includes(record.quote)) return NodeFilter.FILTER_REJECT;
          if (!parent || parent.closest('.study-tools,script,style,textarea,input,button,select')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      const node = walker.nextNode();
      if (!node) return;
      const start = node.nodeValue.indexOf(record.quote);
      const range = document.createRange(); range.setStart(node,start); range.setEnd(node,start+record.quote.length);
      const span = document.createElement('span'); span.className=`study-highlight-${record.type}`; span.dataset.studyAnnotation=record.id;
      try { range.surroundContents(span); } catch (_) {}
    });
  }
  function escapeHtml(text) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  tools.querySelectorAll('[data-action]').forEach(button => button.addEventListener('mousedown', event => event.preventDefault()));
  tools.querySelector('[data-action="yellow"]').addEventListener('click', () => annotate('yellow'));
  tools.querySelector('[data-action="green"]').addEventListener('click', () => annotate('green'));
  tools.querySelector('[data-action="note"]').addEventListener('click', () => annotate('note'));
  tools.querySelector('[data-action="clear-highlights"]').addEventListener('click', () => clearType('highlight'));
  tools.querySelector('[data-action="clear-notes"]').addEventListener('click', () => clearType('note'));
  document.addEventListener('click', event => {
    const mark = event.target.closest('.study-highlight-note');
    if (!mark) return;
    const id = mark.dataset.studyAnnotation;
    const existing = records.find(record => record.id === id);
    const current = mark.dataset.studyNote || existing?.note || '';
    const edited = prompt('查看或编辑备注：', current);
    if (edited === null) return;
    mark.dataset.studyNote = edited; mark.title = edited;
    if (existing) existing.note = edited; else records.push({ id, type:'note', quote:mark.textContent, note:edited, time:Date.now() });
    persist(); render(); window.dispatchEvent(new CustomEvent('studyannotationchange'));
  });
  try { records = JSON.parse(localStorage.getItem(key)) || []; } catch (_) { records = []; }
  restoreMarks(); render();
})();
