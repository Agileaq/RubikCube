import type { Dict } from './types'

export const es: Dict = {
  paint: {
    title: 'Pintar',
    hint: 'Colorea el cubo de la imagen para que coincida con el cubo que tienes en la mano',
    reset: 'Reiniciar',
    export: 'Exportar estado (depuración)',
    copied: 'Copiado ✓',
    startSolve: 'Empezar a resolver',
    tutorialAria: 'Tutorial',
    unsolvable:
      'El estado pintado no es resoluble. 1. Primero comprueba que el estado pintado coincida con el cubo que tienes en la mano. 2. Si el cubo fue girado forzadamente o montado incorrectamente, no se puede resolver (no resoluble).',
  },
  solve: {
    back: 'Volver a pintar',
    preparing: 'Preparando solución…',
    nextMove: 'Siguiente movimiento',
    prevMove: 'Anterior',
    done: 'Resuelto ✓',
    play: 'Reproducir',
    pause: 'Pausar',
    next: 'Siguiente',
    finish: 'Listo',
    speed: 'Velocidad: {s}s/mov',
    stages: ['Cruz blanca', 'Cara blanca + T lateral', 'Aristas de la capa media', 'Cruz amarilla', 'Cara amarilla', 'Colocar esquinas superiores', 'Colocar aristas superiores'],
    notes: [
      'Alinea las aristas blancas con los centros para formar la cruz blanca',
      'Coloca las esquinas blancas para terminar la cara blanca y las cuatro T laterales',
      'Inserta las cuatro aristas de la capa media',
      'Forma la cruz amarilla arriba',
      'Voltea las esquinas superiores para terminar la cara amarilla',
      'Coloca las esquinas superiores (en forma de U)',
      'Coloca las aristas superiores para terminar',
    ],
  },
  tutorial: {
    back: '‹ Atrás',
    title: 'Tutorial del cubo 3×3',
    sections: [
      {
        anchor: 'structure',
        tab: 'Estructura',
        title: '1. Estructura del cubo y notación de movimientos',
        body:
          'Un cubo 3×3 tiene 26 piezas: 6 centros fijos, 12 aristas (dos colores) y 8 esquinas (tres colores). ' +
          'Los centros nunca se mueven y definen el color de cada cara, así que alinea siempre con los centros. ' +
          'Notación: U (arriba), D (abajo), L (izquierda), R (derecha), F (frontal), B (trasera) giran esa cara 90° en sentido horario; ' +
          "un primo (p. ej. R') significa 90° en sentido antihorario; un 2 (p. ej. R2) significa 180°. " +
          'Las caras opuestas son pares de color fijos: blanco↔amarillo, naranja↔rojo, verde↔azul — recordar estos pares ayuda a juzgar la orientación.',
      },
      {
        anchor: 'cross',
        tab: 'Cruz blanca',
        title: '2. Paso 1: la cruz blanca',
        body:
          'Sujeta el centro blanco hacia arriba y construye una cruz blanca en la cara superior. ' +
          'Asegúrate de que el segundo color de cada arista blanca coincida con el centro lateral correspondiente, formando una "cruz alineada" correcta. ' +
          'Este paso es sobre todo intuitivo: lleva primero cada arista blanca a la capa inferior y luego usa giros laterales para insertarla debajo de la cara blanca. ' +
          'Si una arista está volteada, sácala, corrige su orientación y vuelve a insertarla.',
      },
      {
        anchor: 'first-layer',
        tab: 'Cara blanca',
        title: '3. Paso 2: terminar la cara blanca (primera capa)',
        body:
          'Sobre la cruz blanca, coloca las 4 esquinas blancas para completar toda la cara blanca, con una T coincidente en cada lado. ' +
          'Busca una esquina que contenga blanco, gírala hasta debajo de su ranura objetivo y luego insértala con la idea de "bajar-girar-subir": ' +
          "la inserción habitual es R U R' (esquina abajo-derecha) o su espejo L' U' L. Repite hasta que el blanco quede arriba y los tres colores coincidan.",
      },
      {
        anchor: 'middle',
        tab: 'Capa media',
        title: '4. Paso 3: resolver las aristas de la capa media',
        body:
          'Voltea la cara blanca ya terminada hacia abajo y resuelve las 4 aristas de la capa media. ' +
          'En la capa superior busca una arista sin amarillo y alinea su color lateral con el centro correspondiente (formando una T invertida). ' +
          'Si la ranura objetivo está a la derecha, usa el primer algoritmo para insertarla a la derecha; si está a la izquierda, usa el algoritmo espejo para insertarla a la izquierda. ' +
          'Si una arista ya está en la capa media pero mal colocada o volteada, usa el algoritmo para sacarla y vuelve a insertarla.',
      },
      {
        anchor: 'yellow-cross',
        tab: 'Cruz amarilla',
        title: '5. Paso 4: la cruz amarilla arriba',
        body:
          'Ahora la cara superior es amarilla. El objetivo es una cruz amarilla arriba (mira solo las aristas, ignora esquinas y colores laterales). ' +
          'Las aristas amarillas superiores aparecen en tres formas: un punto, una línea o una L (esquina pequeña). ' +
          'Repite el algoritmo para avanzar: punto → L → línea → cruz. ' +
          'Para mejores resultados, coloca la esquina de la L atrás-izquierda y la línea en horizontal antes de ejecutar el algoritmo.',
      },
      {
        anchor: 'yellow-face',
        tab: 'Cara amarilla',
        title: '6. Paso 5: terminar la cara amarilla',
        body:
          'Tras la cruz amarilla, haz que toda la cara superior sea amarilla volteando las 4 esquinas amarillas para que el amarillo quede hacia arriba. ' +
          'Usa el clásico algoritmo Sune. Observa cuántas esquinas amarillas ya quedan hacia arriba, coloca una esquina resuelta (o un punto de referencia) al frente-derecha ' +
          'y repite el algoritmo; cada ejecución cambia la orientación de las esquinas hasta que la cima quede toda amarilla. La cruz puede verse revuelta durante las ejecuciones — es normal.',
      },
      {
        anchor: 'll-corners',
        tab: 'Esquinas',
        title: '7. Paso 6: colocar las esquinas superiores',
        body:
          'Con la cima toda amarilla, comprueba que las 4 esquinas superiores estén en su posición correcta (ignora la orientación; verifica que cada esquina esté donde sus tres colores coincidan). ' +
          'Una esquina bien colocada forma una "U" coincidente con los dos lados adyacentes. Si una esquina está colocada, ponla al frente-derecha como referencia ' +
          'y repite el algoritmo hasta que las 4 esquinas estén colocadas; si ninguna lo está, ejecuta el algoritmo una vez para generar una esquina de referencia.',
      },
      {
        anchor: 'll-edges',
        tab: 'Aristas',
        title: '8. Paso 7: colocar las aristas superiores (final)',
        body:
          'El último paso coloca las 4 aristas superiores para terminar el cubo. ' +
          'Gira la capa superior hasta que al menos un lado muestre tres colores coincidentes (una cara sólida completa). ' +
          'Pon esa cara terminada hacia atrás y ejecuta el algoritmo para ciclar las otras tres aristas. ' +
          'Si ningún lado está alineado, ejecuta el algoritmo una vez para obtener una cara alineada y repite hasta resolver.',
      },
    ],
  },
  update: {
    newVersion: 'Nueva versión disponible',
    updateNow: 'Actualizar ahora',
  },
}
