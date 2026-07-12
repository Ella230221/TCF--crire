(() => {
  const storageKey=`tcf-module-collapse:${location.pathname}`;
  let state={};try{state=JSON.parse(localStorage.getItem(storageKey))||{};}catch(_){}
  const save=()=>localStorage.setItem(storageKey,JSON.stringify(state));
  const page=location.pathname.split('/').pop()||'index.html';
  const modules=[];
  if(page==='t1.html'){
    const main=document.querySelector('.reader-main');
    if(main){const group=document.createElement('section');group.className='major-t1-practice';main.querySelectorAll(':scope > .document-head,:scope > .practice-mode-tabs,:scope > .empty-state,:scope > .continuous-reader,:scope > .sentence-list').forEach(node=>group.appendChild(node));main.appendChild(group);}
    modules.push(['.player-bar','Lecture audio'],['.major-t1-practice','Texte et entraînement'],['.reader-sidebar','Outils et progression']);
  }else if(page==='t2.html'){
    modules.push(['#t2-real-practice','Entraînement sur les sujets'],['#details','Banque d’expressions']);
  }else if(page==='writing.html'){
    modules.push(['.editor-card','Espace d’écriture'],['#writingLibrarySection','Mes textes enregistrés'],['#resultsPanel','Résultats de la correction']);
  }
  modules.forEach(([selector,label],index)=>{
    const module=document.querySelector(selector);if(!module)return;
    const id=`major-${index}-${selector.replace(/[^a-z0-9]/gi,'')}`;module.classList.add('major-collapsible');module.dataset.collapseId=id;
    const bar=document.createElement('div');bar.className='major-collapse-bar';bar.innerHTML=`<strong>${label}</strong><button type="button" aria-expanded="true" title="Réduire le module">⌃</button>`;module.insertBefore(bar,module.firstChild);
    const button=bar.querySelector('button');
    const set=collapsed=>{module.classList.toggle('is-major-collapsed',collapsed);button.textContent=collapsed?'⌄':'⌃';button.setAttribute('aria-expanded',String(!collapsed));button.title=collapsed?'Développer le module':'Réduire le module';};
    set(Boolean(state[id]));button.addEventListener('click',()=>{state[id]=!module.classList.contains('is-major-collapsed');set(state[id]);save();});
  });
  document.querySelectorAll('main details, .content-area details').forEach((details,index)=>{
    const id=`details-${details.id||details.closest('[id]')?.id||index}`;
    if(Object.prototype.hasOwnProperty.call(state,id))details.open=Boolean(state[id]);
    details.addEventListener('toggle',()=>{state[id]=details.open;save();});
  });
})();
