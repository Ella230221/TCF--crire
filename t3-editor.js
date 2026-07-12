(() => {
  const MAX_QUESTIONS = 500;
  const DB_NAME = 'tcf-t3-editor';
  const STORE_NAME = 'documents';
  const categoryIds = ['categorie-education','categorie-travail','categorie-famille','categorie-sante','categorie-technologie','categorie-societe','categorie-argent','categorie-culture','categorie-mode-vie','categorie-valeurs'];
  let customQuestions = [];
  let saveTimer;

  function escapeHtml(text) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function openDb(){return new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('IndexedDB timeout')),1500);const request=indexedDB.open(DB_NAME,2);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE_NAME))db.createObjectStore(STORE_NAME);};request.onsuccess=()=>{clearTimeout(timeout);resolve(request.result);};request.onerror=()=>{clearTimeout(timeout);reject(request.error);};request.onblocked=()=>{clearTimeout(timeout);reject(new Error('IndexedDB blocked'));};});}
  async function persist(){customQuestions=customQuestions.slice(0,MAX_QUESTIONS);try{const db=await openDb();db.transaction(STORE_NAME,'readwrite').objectStore(STORE_NAME).put(customQuestions,'categoryQuestions');}catch(_){localStorage.setItem('tcf-t3-category-questions-v1',JSON.stringify(customQuestions));}}
  async function restore(){try{const db=await openDb();customQuestions=await new Promise(resolve=>{const request=db.transaction(STORE_NAME).objectStore(STORE_NAME).get('categoryQuestions');request.onsuccess=()=>resolve(request.result||[]);request.onerror=()=>resolve([]);});}catch(_){try{customQuestions=JSON.parse(localStorage.getItem('tcf-t3-category-questions-v1'))||[];}catch(_){customQuestions=[];}}}
  function answerHtml(text){return text.split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>`<p>${escapeHtml(line)}</p>`).join('')||'<p><br></p>';}
  function recolorTemplates(card){
    card.querySelectorAll('.template-fragment').forEach(fragment=>fragment.replaceWith(...fragment.childNodes));
    card.querySelectorAll('.t3-user-answer p').forEach(p=>p.normalize());
    if(typeof window.colorTemplateFragments==='function')window.colorTemplateFragments();
  }
  function updateCategoryCount(categoryId){const bar=document.getElementById(categoryId)?.querySelector('.t3-category-addbar span');if(bar)bar.textContent=`${customQuestions.filter(item=>item.category===categoryId).length} ajoutée(s)`;}
  function renumberCategory(categoryId){
    const category=document.getElementById(categoryId);if(!category)return;
    category.querySelectorAll('.t3-category__questions > .t3-question').forEach((card,index)=>{const number=card.querySelector('.t3-user-number');if(number)number.textContent=`${index+1}. `;else{const summary=card.querySelector(':scope > details > summary');if(summary)summary.textContent=`${index+1}. ${summary.textContent.replace(/^\d+\.\s*/,'')}`;}});updateCategoryCount(categoryId);
  }
  function updateSidebar(){
    categoryIds.forEach(categoryId=>{
      const navList=document.querySelector(`.nav-category > a[href="#${categoryId}"]`)?.parentElement.querySelector(':scope > ul');if(!navList)return;
      navList.querySelectorAll('.t3-user-nav').forEach(item=>item.remove());
      customQuestions.filter(item=>item.category===categoryId).forEach(item=>{const li=document.createElement('li');li.className='t3-user-nav';li.innerHTML=`<a href="#${item.id}">${escapeHtml(item.title)}</a>`;navList.appendChild(li);});
    });
  }
  function saveCard(card){
    const item=customQuestions.find(entry=>entry.id===card.id);if(!item)return;
    item.title=card.querySelector('.t3-user-title').innerText.trim()||'Question sans titre';
    recolorTemplates(card);
    item.html=card.querySelector('.t3-user-answer').innerHTML;
    item.text=card.querySelector('.t3-user-answer').innerText.trim();item.updatedAt=Date.now();
    persist();updateSidebar();renumberCategory(item.category);
    card.querySelector('.t3-user-save').textContent='Enregistré ✓';setTimeout(()=>{const button=card.querySelector('.t3-user-save');if(button)button.textContent='Enregistrer';},1000);
  }
  function makeCard(item){
    const category=document.getElementById(item.category);const container=category?.querySelector('.t3-category__questions');if(!container)return;
    container.querySelector('.t3-category__empty')?.remove();
    const card=document.createElement('section');card.id=item.id;card.className='section t3-question t3-user-question';
    card.innerHTML=`<details class="t3-details" open><summary><span class="t3-user-number"></span><span class="t3-user-title" contenteditable="true">${escapeHtml(item.title)}</span></summary><div class="t3-user-answer" contenteditable="true" spellcheck="true" lang="fr">${item.html||answerHtml(item.text||'')}</div><div class="t3-user-card-actions"><button class="t3-user-save" type="button">Enregistrer</button><button class="t3-user-delete" type="button">Supprimer</button></div></details>`;
    card.querySelector('.t3-user-save').addEventListener('click',()=>saveCard(card));
    card.querySelector('.t3-user-title').addEventListener('click',event=>event.stopPropagation());
    card.querySelector('.t3-user-answer').addEventListener('focusout',()=>saveCard(card));
    card.querySelector('.t3-user-delete').addEventListener('click',()=>{if(!confirm('Supprimer cette question ?'))return;customQuestions=customQuestions.filter(entry=>entry.id!==item.id);card.remove();persist();updateSidebar();renumberCategory(item.category);if(!container.querySelector('.t3-question'))container.innerHTML='<p class="t3-category__empty">Aucune question pour le moment</p>';});
    card.addEventListener('input',()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveCard(card),700);});
    container.appendChild(card);recolorTemplates(card);renumberCategory(item.category);
  }
  function openComposer(categoryId){
    document.querySelectorAll('.t3-question-composer').forEach(form=>form.remove());
    const category=document.getElementById(categoryId),container=category?.querySelector('.t3-category__questions');if(!container)return;
    const form=document.createElement('div');form.className='t3-question-composer';
    form.innerHTML=`<label>Question<input class="t3-compose-title" type="text" lang="fr" placeholder="Saisissez la question…"></label><label>Réponse<textarea class="t3-compose-answer" lang="fr" rows="10" placeholder="Collez ou saisissez la réponse complète…"></textarea></label><div><button class="t3-compose-save" type="button">Ajouter et enregistrer</button><button class="t3-compose-cancel" type="button">Annuler</button></div>`;
    container.prepend(form);form.querySelector('.t3-compose-title').focus();
    form.querySelector('.t3-compose-cancel').onclick=()=>form.remove();
    form.querySelector('.t3-compose-save').onclick=()=>{const title=form.querySelector('.t3-compose-title').value.trim(),text=form.querySelector('.t3-compose-answer').value.trim();if(!title||!text)return alert('Veuillez saisir la question et la réponse.');if(customQuestions.length>=MAX_QUESTIONS)return alert('La limite est de 500 questions.');const item={id:`t3-user-${Date.now()}-${Math.random().toString(16).slice(2)}`,category:categoryId,title,text,html:answerHtml(text),createdAt:Date.now(),updatedAt:Date.now()};customQuestions.push(item);form.remove();makeCard(item);saveCard(document.getElementById(item.id));};
  }
  function addCategoryControls(){categoryIds.forEach(categoryId=>{const category=document.getElementById(categoryId);if(!category)return;const details=category.querySelector('.t3-category__details');const bar=document.createElement('div');bar.className='t3-category-addbar';bar.innerHTML=`<button type="button">+ Ajouter une question et une réponse</button><span>${customQuestions.filter(item=>item.category===categoryId).length} ajoutée(s)</span>`;bar.querySelector('button').onclick=()=>openComposer(categoryId);details.insertBefore(bar,category.querySelector('.t3-category__questions'));});}

  async function init(){await restore();addCategoryControls();customQuestions.forEach(makeCard);updateSidebar();
    const editableNodes=[...document.querySelectorAll('main .section p, main .section li, main .section h3')].filter(node=>!node.closest('.t3-user-question'));
    const moduleKey='tcf-t3-editable-nodes-v3';
    const legacyKey='tcf-t3-editable-nodes-v2';
    const abroadTemplateRevision='template-100-v1';
    const abroadRevisionKey='tcf-t3-experience-etranger-revision';
    const refreshAbroadTemplate=localStorage.getItem(abroadRevisionKey)!==abroadTemplateRevision;
    editableNodes.forEach(node=>{
      node.contentEditable='true';
      const section=node.closest('.section[id]');
      const sectionNodes=section?[...section.querySelectorAll('p, li, h3')].filter(item=>!item.closest('.t3-user-question')):editableNodes;
      node.dataset.editKey=`${section?.id||'main'}:${node.tagName.toLowerCase()}:${sectionNodes.indexOf(node)}`;
    });
    try{
      const stableEdits=JSON.parse(localStorage.getItem(moduleKey))||{};
      if(Object.keys(stableEdits).length){
        editableNodes.forEach(node=>{if(refreshAbroadTemplate&&node.closest('#experience-etranger-reussite'))return;if(Object.prototype.hasOwnProperty.call(stableEdits,node.dataset.editKey))node.innerHTML=stableEdits[node.dataset.editKey];});
        if(refreshAbroadTemplate){editableNodes.filter(node=>node.closest('#experience-etranger-reussite')).forEach(node=>stableEdits[node.dataset.editKey]=node.innerHTML);localStorage.setItem(moduleKey,JSON.stringify(stableEdits));}
      }else{
        const legacyEdits=JSON.parse(localStorage.getItem(legacyKey))||{};
        const legacyNodes=editableNodes.filter(node=>!node.closest('#experience-etranger-reussite'));
        legacyNodes.forEach((node,index)=>{const key=`edit-${index}`;if(Object.prototype.hasOwnProperty.call(legacyEdits,key))node.innerHTML=legacyEdits[key];});
        const migrated={};editableNodes.forEach(node=>migrated[node.dataset.editKey]=node.innerHTML);localStorage.setItem(moduleKey,JSON.stringify(migrated));
      }
      if(refreshAbroadTemplate)localStorage.setItem(abroadRevisionKey,abroadTemplateRevision);
    }catch(_){}
    document.querySelector('main').addEventListener('input',event=>{if(event.target.closest('.t3-user-question,.t3-question-composer'))return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{const edits={};editableNodes.forEach(node=>edits[node.dataset.editKey]=node.innerHTML);localStorage.setItem(moduleKey,JSON.stringify(edits));},600);});
  }
  init();
})();
