(() => {
  const T2_LIBRARY_KEY = 'tcf-t2-practice-library-v1';
  const T2_DB_NAME = 'tcf-t2-practice-database';
  const T2_DB_STORE = 'library';
  const MAX_T2 = 500;

  function readJson(value, fallback) {
    try { return JSON.parse(value) ?? fallback; } catch (_) { return fallback; }
  }

  function signature(item) {
    return String(item?.signature || item?.fr || item?.title || item?.id || '')
      .toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9œæ' ]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function mergeT2(...libraries) {
    const merged = new Map();
    libraries.flat().filter(Boolean).forEach(item => {
      const key = item.id || signature(item);
      const current = merged.get(key);
      if (!current || (item.updatedAt || 0) >= (current.updatedAt || 0)) merged.set(key, { ...current, ...item });
    });
    const unique = new Map();
    [...merged.values()].forEach(item => {
      const key = signature(item) || item.id;
      const current = unique.get(key);
      if (!current || (item.updatedAt || 0) >= (current.updatedAt || 0)) unique.set(key, item);
    });
    return [...unique.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, MAX_T2);
  }

  function openT2Db() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('IndexedDB timeout')), 1800);
      const request = indexedDB.open(T2_DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(T2_DB_STORE)) request.result.createObjectStore(T2_DB_STORE);
      };
      request.onsuccess = () => { clearTimeout(timeout); resolve(request.result); };
      request.onerror = () => { clearTimeout(timeout); reject(request.error); };
      request.onblocked = () => { clearTimeout(timeout); reject(new Error('IndexedDB blocked')); };
    });
  }

  async function readT2Db() {
    try {
      const db = await openT2Db();
      return await new Promise(resolve => {
        const request = db.transaction(T2_DB_STORE).objectStore(T2_DB_STORE).get('practices');
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch (_) { return []; }
  }

  async function writeT2Db(items) {
    try {
      const db = await openT2Db();
      await new Promise((resolve, reject) => {
        const transaction = db.transaction(T2_DB_STORE, 'readwrite');
        transaction.objectStore(T2_DB_STORE).put(items, 'practices');
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (_) {}
  }

  function showStatus(message, isError = false) {
    let toast = document.querySelector('.data-sync-toast');
    if (!toast) { toast = document.createElement('div'); toast.className = 'data-sync-toast'; document.body.appendChild(toast); }
    toast.textContent = message;
    toast.classList.toggle('is-error', isError);
    toast.classList.add('is-visible');
    clearTimeout(showStatus.timer);
    showStatus.timer = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  }

  async function exportData() {
    const local = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('tcf-')) local[key] = localStorage.getItem(key);
    }
    const localT2 = readJson(localStorage.getItem(T2_LIBRARY_KEY), []);
    const t2Library = mergeT2(await readT2Db(), localT2);
    const payload = { format: 'tcf-studio-backup', version: 1, exportedAt: new Date().toISOString(), localStorage: local, t2Library };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tcf-studio-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showStatus(`Sauvegarde créée · ${t2Library.length} sujets T2 inclus`);
  }

  async function importData(file) {
    try {
      const payload = JSON.parse(await file.text());
      if (payload.format !== 'tcf-studio-backup' || !payload.localStorage) throw new Error('format');
      Object.entries(payload.localStorage).forEach(([key, value]) => {
        if (key.startsWith('tcf-') && typeof value === 'string' && key !== T2_LIBRARY_KEY) localStorage.setItem(key, value);
      });
      const currentLocal = readJson(localStorage.getItem(T2_LIBRARY_KEY), []);
      const mergedT2 = mergeT2(await readT2Db(), currentLocal, payload.t2Library || readJson(payload.localStorage[T2_LIBRARY_KEY], []));
      localStorage.setItem(T2_LIBRARY_KEY, JSON.stringify(mergedT2));
      await writeT2Db(mergedT2);
      showStatus(`Données restaurées · ${mergedT2.length} sujets T2 disponibles`);
      setTimeout(() => location.reload(), 900);
    } catch (_) {
      showStatus('Ce fichier de sauvegarde n’est pas valide.', true);
    }
  }

  const nav = document.querySelector('.site-switcher');
  if (!nav || nav.querySelector('.data-sync-actions')) return;
  const actions = document.createElement('div');
  actions.className = 'data-sync-actions';
  actions.innerHTML = '<button type="button" class="data-sync-export" title="Créer une sauvegarde utilisable sur un autre appareil">⇩ <span>Sauvegarder</span></button><button type="button" class="data-sync-import" title="Restaurer une sauvegarde locale ou en ligne">⇧ <span>Restaurer</span></button><input type="file" accept="application/json,.json" hidden>';
  nav.appendChild(actions);
  const input = actions.querySelector('input');
  actions.querySelector('.data-sync-export').addEventListener('click', exportData);
  actions.querySelector('.data-sync-import').addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files[0]) importData(input.files[0]); input.value = ''; });
  window.tcfDataSync = { exportData, importData };
})();
