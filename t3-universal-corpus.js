(() => {
 const applyCorpus=()=>{
  const examples=document.querySelector('#exemples-universels .example-block');
  if(examples&&!document.getElementById('universal-examples-extension')){
    const block=document.createElement('div');block.id='universal-examples-extension';
    block.innerHTML=`
      <p>Mon fils — protection des animaux</p>
      <p>À l'école, mon fils apprend que certaines espèces sont menacées et que chaque animal joue un rôle dans la nature. Cette sensibilisation lui permet de mieux comprendre l'importance de protéger les animaux et leur habitat.</p>
      <p>Mon amie Sophie — métier de professeur</p>
      <p>Mon amie Sophie travaille comme professeure dans une école primaire à Vancouver. Elle prépare ses cours, adapte ses explications aux besoins de chaque élève et communique régulièrement avec les parents. Même si son métier demande beaucoup de patience et de responsabilités, elle est heureuse de voir les enfants progresser.</p>
      <p>Mon père — travail et âge</p>
      <p>Après de nombreuses années de travail, mon père souhaite rester actif, mais il préfère réduire progressivement son rythme. Il tient compte de son état de santé et consulte son médecin lorsque cela est nécessaire. Son exemple montre que l'âge ne peut pas être le seul critère pour décider d'arrêter de travailler.</p>`;
    examples.appendChild(block);
  }
  const corpus=document.querySelector('#corpus-logique > details');
  if(corpus&&!document.getElementById('logique-proteger-especes')){
    const block=document.createElement('div');block.id='universal-corpus-extension';
    block.innerHTML=`
      <details id="logique-proteger-especes" class="logic-details"><summary>18. Logique : Protéger les animaux en voie de disparition</summary>
        <p class="logic-original-line">Pour commencer, protéger les espèces menacées permet de préserver la biodiversité et l'équilibre de la nature. Chaque espèce joue un rôle dans son environnement.</p>
        <p class="logic-original-line">Ensuite, l'éducation joue un rôle essentiel. Sensibiliser les enfants dès le plus jeune âge permet de développer des comportements plus responsables.</p>
        <p class="logic-original-line">Par ailleurs, les actions individuelles ne suffisent pas toujours. Les pouvoirs publics, les entreprises et les associations doivent également protéger les habitats naturels et mettre en place des mesures adaptées.</p>
        <p class="logic-original-line">En définitive, protéger les animaux est une responsabilité collective. L'essentiel est d'agir ensemble afin de préserver la biodiversité pour les générations futures.</p>
      </details>
      <details id="logique-metier-professeur" class="logic-details"><summary>19. Logique : Comprendre la difficulté du métier de professeur</summary>
        <p class="logic-original-line">Pour commencer, un professeur doit transmettre des connaissances et préparer les élèves à leur avenir. Cette mission demande de solides compétences et un travail régulier.</p>
        <p class="logic-original-line">Ensuite, il doit adapter ses explications aux besoins et au niveau de chaque élève. Il faut donc faire preuve de patience, d'écoute et de capacité d'adaptation.</p>
        <p class="logic-original-line">Par ailleurs, le professeur doit communiquer avec les familles, gérer la classe et assumer de nombreuses responsabilités. Malgré ces difficultés, voir les élèves progresser peut apporter une grande satisfaction.</p>
        <p class="logic-original-line">En définitive, le métier de professeur est exigeant, mais il joue un rôle essentiel dans l'éducation et le développement des enfants.</p>
      </details>
      <details id="logique-age-travail" class="logic-details"><summary>20. Logique : Choisir un âge raisonnable pour arrêter de travailler</summary>
        <p class="logic-original-line">Pour commencer, continuer à travailler permet de rester actif, de conserver des relations sociales et de transmettre son expérience.</p>
        <p class="logic-original-line">Ensuite, l'âge ne constitue pas le seul facteur à prendre en compte. L'état de santé, la pénibilité du métier et la motivation sont également essentiels.</p>
        <p class="logic-original-line">Par ailleurs, une transition progressive peut représenter une solution adaptée. Réduire son temps de travail permet de préserver sa santé tout en restant actif.</p>
        <p class="logic-original-line">En définitive, il n'existe pas un âge idéal pour tout le monde. L'essentiel est d'adapter la décision à la situation et aux besoins de chacun.</p>
      </details>`;
    corpus.appendChild(block);
  }
 };
 window.applyT3UniversalCorpus=applyCorpus;
 applyCorpus();
})();
