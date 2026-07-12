(() => {
  const translations = new Map(Object.entries({
    '自我介绍':'Présentation','口语':'Expression orale','写作练习':'Expression écrite','T1 自我介绍':'T1 Présentation','T2 口语':'T2 Expression orale','T3 口语':'T3 Expression orale',
    '法语口语训练':'Entraînement oral en français','添加文本':'Ajouter un texte','上传 TXT':'Importer un fichier TXT','我的自我介绍':'Mes présentations','练习进度':'Progression','练习方法':'Méthode de travail','先听 AI 逐句朗读':'Écoutez chaque phrase lue par l’IA','录下自己的发音':'Enregistrez votre prononciation','使用识别功能比较':'Comparez avec la reconnaissance vocale','反复练习低分句子':'Répétez les phrases à améliorer','句已练习':'phrases pratiquées','字符':'caractères','句':'phrases','约':'environ','分钟':'minutes','法语声音':'Voix française','全文朗读':'Lecture intégrale','准备就绪':'Prêt','语速':'Vitesse','我的法语自我介绍':'Ma présentation en français','整体听 AI 朗读':'Écouter la lecture complète','逐句跟读与纠音':'Répétition et correction phrase par phrase','添加你的法语自我介绍':'Ajouter votre présentation en français','开始添加文本':'Commencer','AI 朗读时，当前句会自动高亮并跟随滚动':'Pendant la lecture, la phrase actuelle est suivie automatiquement','从头朗读全文':'Lire depuis le début','录入自我介绍':'Saisir la présentation','标题':'Titre','法语正文':'Texte français','保存并生成逐句练习':'Enregistrer et créer les exercices','AI 朗读':'Lecture IA','开始录音':'Enregistrer','回放录音':'Réécouter','发音识别':'Reconnaissance vocale','未练习':'Non pratiqué',
    '导航目录':'Sommaire','真题练习':'Sujets d’entraînement','表达积累':'Expressions utiles','提问流程':'Déroulement des questions','开场结束过渡句':'Transitions d’ouverture et de conclusion','搞事情':'Situations délicates','🧩 问句结构总结':'🧩 Structures interrogatives','问句结构总结':'Structures interrogatives','法语原题':'Sujet en français','我准备的完整对话':'Mon dialogue complet','立即基础评分':'Évaluation de base','GPT 深度评分':'Évaluation approfondie GPT','复制给 ChatGPT':'Copier pour ChatGPT','保存真题':'Enregistrer le sujet','评分与修改建议':'Évaluation et corrections','我的真题练习库':'Mes sujets enregistrés','排列方式':'Trier par','最新练习':'Les plus récents','最早练习':'Les plus anciens','载入练习':'Ouvrir','删除':'Supprimer',
    '写作功能':'Fonctions d’écriture','范文模板':'Modèle','撤销':'Annuler','重做':'Rétablir','新建文章':'Nouveau texte','保存':'Enregistrer','提交批改':'Soumettre pour correction','选择写作任务':'Choisir la tâche','练习题型':'Type d’exercice','特殊字符':'Caractères spéciaux','小写':'Minuscules','大写':'Majuscules','字体颜色':'Couleur du texte','红色':'Rouge','蓝色':'Bleu','绿色':'Vert','橙色':'Orange','紫色':'Violet','黑色':'Noir','录入需要对照的完整模板':'Saisir le modèle complet à comparer','我的写作练习库':'Mes textes enregistrés','按 Tâche':'Par tâche','按标题':'Par titre','写作检查结果':'Résultats de la correction','模板一致性':'Correspondance avec le modèle','语法与书写建议':'Suggestions grammaticales et rédactionnelles',
    '高亮':'Surligner','批注':'Annoter','清除高亮':'Effacer les surlignages','清除批注':'Effacer les annotations','黄色高亮':'Surligner en jaune','绿色高亮':'Surligner en vert'
  }));
  const chinese=/[\u3400-\u9fff]/;
  const orderedTranslations=[...translations.entries()].filter(([key])=>chinese.test(key)).sort((a,b)=>b[0].length-a[0].length);
  function clean(value){
    if(!value||!chinese.test(value))return value;
    const trimmed=value.trim();if(translations.has(trimmed))return value.replace(trimmed,translations.get(trimmed));
    let translated=value;orderedTranslations.forEach(([source,target])=>{if(translated.includes(source))translated=translated.split(source).join(target);});if(!chinese.test(translated))return translated;
    const numbered=trimmed.match(/^(\d+\.\s*)(.+)$/);if(numbered&&translations.has(numbered[2]))return value.replace(trimmed,`${numbered[1]}${translations.get(numbered[2])}`);
    let out=translated.replace(/（[^）]*[\u3400-\u9fff][^）]*）/g,'').replace(/\([^)]*[\u3400-\u9fff][^)]*\)/g,'');
    out=out.replace(/(?:——|--|:|:) *[^\n]*[\u3400-\u9fff][^\n]*/g,'');
    out=out.replace(/[\u3400-\u9fff]/g,'').replace(/[，。；：！？、“”【】（）]/g,' ').replace(/\s{2,}/g,' ');
    return out.trim() ? out : '';
  }
  function process(root=document.body){
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{const parent=node.parentElement;if(!parent||parent.closest('script,style,textarea,input,[contenteditable="true"]'))return;node.nodeValue=clean(node.nodeValue);});
    root.querySelectorAll?.('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(attr=>{if(el.hasAttribute(attr)){const next=clean(el.getAttribute(attr));if(next)el.setAttribute(attr,next);else if(attr==='placeholder')el.setAttribute(attr,'Saisissez votre texte…');}}));
  }
  const nativeAlert=window.alert.bind(window),nativeConfirm=window.confirm.bind(window),nativePrompt=window.prompt.bind(window);
  window.alert=message=>nativeAlert(clean(String(message))||'Opération terminée.');
  window.confirm=message=>nativeConfirm(clean(String(message))||'Confirmer cette action ?');
  window.prompt=(message,value)=>nativePrompt(clean(String(message))||'Saisissez votre annotation :',value);
  process();let timer;new MutationObserver(mutations=>{clearTimeout(timer);timer=setTimeout(()=>mutations.forEach(m=>m.addedNodes.forEach(node=>{if(node.nodeType===1)process(node);else if(node.nodeType===3&&!node.parentElement?.closest('textarea,input,[contenteditable="true"]'))node.nodeValue=clean(node.nodeValue); })),30);}).observe(document.body,{childList:true,subtree:true});
})();
