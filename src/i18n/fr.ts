import type { Dict } from './types'

export const fr: Dict = {
  paint: {
    title: 'Peindre',
    hint: 'Coloriez le cube à l’écran pour qu’il corresponde au cube entre vos mains',
    reset: 'Réinitialiser',
    export: 'Exporter l’état (débogage)',
    copied: 'Copié ✓',
    startSolve: 'Commencer la résolution',
    tutorialAria: 'Tutoriel',
    unsolvable:
      'L’état peint n’est pas résolvable. 1. Vérifiez d’abord que l’état peint correspond bien au cube entre vos mains. 2. Si le cube a été tordu ou remonté incorrectement, il ne peut pas être résolu (insolvable).',
  },
  solve: {
    back: 'Retour à la peinture',
    preparing: 'Préparation de la solution…',
    nextMove: 'Coup suivant',
    prevMove: 'Précédent',
    done: 'Résolu ✓',
    play: 'Lecture',
    pause: 'Pause',
    next: 'Suivant',
    finish: 'Terminer',
    speed: 'Vitesse : {s}s/coup',
    stages: ['Croix blanche', 'Face blanche + T latéral', 'Arêtes de la couche du milieu', 'Croix jaune', 'Face jaune', 'Positionner les coins du dessus', 'Positionner les arêtes du dessus'],
    notes: [
      'Alignez les arêtes blanches avec les centres pour former la croix blanche',
      'Placez les coins blancs pour terminer la face blanche et les quatre T latéraux',
      'Insérez les quatre arêtes de la couche du milieu',
      'Formez la croix jaune sur le dessus',
      'Retournez les coins du dessus pour terminer la face jaune',
      'Positionnez les coins du dessus (en forme de U)',
      'Positionnez les arêtes du dessus pour terminer',
    ],
  },
  tutorial: {
    back: '‹ Retour',
    title: 'Tutoriel du cube 3×3',
    sections: [
      {
        anchor: 'structure',
        tab: 'Structure',
        title: '1. Structure du cube & notation des mouvements',
        body:
          'Un cube 3×3 compte 26 pièces : 6 centres fixes, 12 arêtes (deux couleurs) et 8 coins (trois couleurs). ' +
          'Les centres ne bougent jamais et définissent la couleur de chaque face, donc alignez-vous toujours sur les centres. ' +
          'Notation : U (haut), D (bas), L (gauche), R (droite), F (avant), B (arrière) tournent la face correspondante de 90° dans le sens horaire ; ' +
          "une prime (ex. R') signifie 90° dans le sens anti-horaire ; un 2 (ex. R2) signifie 180°. " +
          'Les faces opposées forment des paires de couleurs fixes : blanc↔jaune, orange↔rouge, vert↔bleu — retenir ces paires aide à juger l’orientation.',
      },
      {
        anchor: 'cross',
        tab: 'Croix blanche',
        title: '2. Étape 1 : la croix blanche',
        body:
          'Tenez le centre blanc vers le haut et formez une croix blanche sur la face du haut. ' +
          'Assurez-vous que la deuxième couleur de chaque arête blanche s’aligne avec le centre latéral correspondant, formant une « croix alignée » correcte. ' +
          'Cette étape est surtout intuitive : amenez d’abord chaque arête blanche sur la couche du bas, puis utilisez des tours latéraux pour l’insérer sous la face blanche. ' +
          'Si une arête est retournée, sortez-la, corrigez son orientation, puis réinsérez-la.',
      },
      {
        anchor: 'first-layer',
        tab: 'Face blanche',
        title: '3. Étape 2 : terminer la face blanche (première couche)',
        body:
          'Au-dessus de la croix blanche, placez les 4 coins blancs pour compléter toute la face blanche, avec un T correspondant sur chaque côté. ' +
          'Trouvez un coin contenant du blanc, amenez-le sous son emplacement cible, puis insérez-le avec l’idée « bas-tour-haut » : ' +
          "l’insertion courante est R U R' (coin en bas à droite) ou son miroir L' U' L. Répétez jusqu’à ce que le blanc soit en haut et que les trois couleurs s’alignent.",
      },
      {
        anchor: 'middle',
        tab: 'Couche du milieu',
        title: '4. Étape 3 : résoudre les arêtes de la couche du milieu',
        body:
          'Retournez la face blanche terminée vers le bas, puis résolvez les 4 arêtes de la couche du milieu. ' +
          'Sur la couche du haut, trouvez une arête sans jaune et alignez sa couleur latérale avec le centre correspondant (formant un T inversé). ' +
          'Si l’emplacement cible est à droite, utilisez le premier algorithme pour l’insérer à droite ; s’il est à gauche, utilisez l’algorithme miroir pour l’insérer à gauche. ' +
          'Si une arête est déjà dans la couche du milieu mais mal placée ou retournée, utilisez l’algorithme pour la sortir, puis réinsérez-la.',
      },
      {
        anchor: 'yellow-cross',
        tab: 'Croix jaune',
        title: '5. Étape 4 : la croix jaune sur le dessus',
        body:
          'Maintenant la face du haut est jaune. L’objectif est une croix jaune sur le dessus (regardez seulement les arêtes, ignorez les coins et les couleurs latérales). ' +
          'Les arêtes jaunes du dessus apparaissent en trois formes : un point, une ligne ou un L (petit coin). ' +
          'Répétez l’algorithme pour progresser : point → L → ligne → croix. ' +
          'Pour de meilleurs résultats, placez le coin du L en arrière-gauche et la ligne horizontalement avant d’exécuter l’algorithme.',
      },
      {
        anchor: 'yellow-face',
        tab: 'Face jaune',
        title: '6. Étape 5 : terminer la face jaune',
        body:
          'Après la croix jaune, rendez toute la face du haut jaune en retournant les 4 coins jaunes afin que le jaune soit vers le haut. ' +
          'Utilisez le classique algorithme Sune. Regardez combien de coins jaunes sont déjà vers le haut, placez un coin résolu (ou un point de repère) à l’avant-droite, ' +
          'et répétez l’algorithme ; chaque exécution modifie l’orientation des coins jusqu’à ce que le dessus soit entièrement jaune. La croix peut paraître brouillée pendant les exécutions — c’est normal.',
      },
      {
        anchor: 'll-corners',
        tab: 'Coins',
        title: '7. Étape 6 : positionner les coins du dessus',
        body:
          'Avec le dessus tout jaune, vérifiez que les 4 coins du dessus sont aux bonnes positions (ignorez l’orientation ; vérifiez que chaque coin se trouve là où ses trois couleurs correspondent). ' +
          'Un coin bien placé forme un « U » correspondant avec les deux côtés adjacents. Si un coin est placé, mettez-le à l’avant-droite comme repère ' +
          'et répétez l’algorithme jusqu’à ce que les 4 coins soient placés ; si aucun n’est placé, exécutez l’algorithme une fois pour produire un coin de repère.',
      },
      {
        anchor: 'll-edges',
        tab: 'Arêtes',
        title: '8. Étape 7 : positionner les arêtes du dessus (fin)',
        body:
          'La dernière étape place les 4 arêtes du dessus pour terminer le cube. ' +
          'Tournez la couche du haut jusqu’à ce qu’au moins un côté affiche trois couleurs correspondantes (une face unie complète). ' +
          'Placez cette face terminée à l’arrière, puis exécutez l’algorithme pour faire cycler les trois autres arêtes. ' +
          'Si aucun côté n’est aligné, exécutez l’algorithme une fois pour obtenir une face alignée, puis répétez jusqu’à la résolution.',
      },
    ],
  },
  update: {
    newVersion: 'Nouvelle version disponible',
    updateNow: 'Mettre à jour maintenant',
  },
}
