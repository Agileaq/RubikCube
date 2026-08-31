import type { Dict } from './types'

export const en: Dict = {
  paint: {
    title: 'Paint',
    hint: 'Color the cube in the picture to match the cube in your hand',
    reset: 'Reset',
    export: 'Export state (debug)',
    copied: 'Copied ✓',
    startSolve: 'Start solving',
    tutorialAria: 'Tutorial',
    unsolvable:
      'The painted state is not solvable. 1. First check that the painted state matches the cube in your hand. 2. If the cube was twisted or reassembled incorrectly, it cannot be solved (unsolvable).',
  },
  solve: {
    back: 'Back to paint',
    preparing: 'Preparing solution…',
    nextMove: 'Next move',
    prevMove: 'Previous',
    done: 'Solved ✓',
    play: 'Play',
    pause: 'Pause',
    next: 'Next',
    finish: 'Done',
    speed: 'Speed: {s}s/move',
    stages: ['White cross', 'White face + side T', 'Middle-layer edges', 'Yellow cross', 'Yellow face', 'Position top corners', 'Position top edges'],
    notes: [
      'Align the white edges with the centers to build the white cross',
      'Place the white corners to finish the white face and the four side Ts',
      'Insert the four middle-layer edges',
      'Build the yellow cross on top',
      'Flip the top corners to finish the yellow face',
      'Position the top corners (U-shape)',
      'Position the top edges to finish',
    ],
  },
  tutorial: {
    back: '‹ Back',
    title: '3×3 Cube Tutorial',
    sections: [
      {
        anchor: 'structure',
        tab: 'Structure',
        title: '1. Cube structure & move notation',
        body:
          'A 3×3 cube has 26 pieces: 6 fixed centers, 12 edges (two colors) and 8 corners (three colors). ' +
          'Centers never move and define each face’s color, so always align to the centers. ' +
          'Notation: U (up), D (down), L (left), R (right), F (front), B (back) turn that face 90° clockwise; ' +
          "a prime (e.g. R') means 90° counter-clockwise; a 2 (e.g. R2) means 180°. " +
          'Opposite faces are fixed color pairs: white↔yellow, orange↔red, green↔blue — remembering these pairs helps you judge orientation.',
      },
      {
        anchor: 'cross',
        tab: 'White cross',
        title: '2. Step 1: the white cross',
        body:
          'Hold the white center on top and build a white cross on the top face. ' +
          'Make sure the second color of each white edge lines up with the matching side center, forming a correct "aligned cross". ' +
          'This step is mostly intuitive: bring each white edge to the bottom layer first, then use side turns to insert it under the white face. ' +
          'If an edge is flipped, take it out, fix its orientation, then insert it.',
      },
      {
        anchor: 'first-layer',
        tab: 'White face',
        title: '3. Step 2: finish the white face (first layer)',
        body:
          'On top of the white cross, place the 4 white corners to complete the whole white face, with a matching T on each side. ' +
          'Find a corner containing white, turn it under its target slot, then insert it with the "down-turn-up" idea: ' +
          "the common insert is R U R' (corner at bottom-right) or its mirror L' U' L. Repeat until white is on top and all three colors align.",
      },
      {
        anchor: 'middle',
        tab: 'Middle layer',
        title: '4. Step 3: solve the middle-layer edges',
        body:
          'Flip the finished white face to the bottom, then solve the 4 middle-layer edges. ' +
          'On the top layer find an edge without yellow, and align its side color with the matching center (forming an upside-down T). ' +
          'If the target slot is on the right, use the first algorithm to insert it right; if on the left, use the mirror algorithm to insert it left. ' +
          'If an edge is already in the middle layer but misplaced or flipped, use the algorithm to take it out, then re-insert it.',
      },
      {
        anchor: 'yellow-cross',
        tab: 'Yellow cross',
        title: '5. Step 4: the yellow cross on top',
        body:
          'Now the top face is yellow. The goal is a yellow cross on top (look at edges only, ignore corners and side colors). ' +
          'The top yellow edges appear in three shapes: a dot, a line, or an L (small corner). ' +
          'Repeat the algorithm to advance: dot → L → line → cross. ' +
          'For best results, place the L corner at the back-left and the line horizontally before running the algorithm.',
      },
      {
        anchor: 'yellow-face',
        tab: 'Yellow face',
        title: '6. Step 5: finish the yellow face',
        body:
          'After the yellow cross, make the whole top face yellow by flipping the 4 yellow corners so yellow faces up. ' +
          'Use the classic Sune algorithm. Look at how many yellow corners already face up, place one solved corner (or a reference point) at the front-right, ' +
          'and repeat the algorithm; each run changes corner orientation until the top is all yellow. The cross may look scrambled during the runs — that is normal.',
      },
      {
        anchor: 'll-corners',
        tab: 'Corners',
        title: '7. Step 6: position the top corners',
        body:
          'With the top all yellow, check that the 4 top corners are in the right positions (ignore orientation; check that each corner sits where its three colors match). ' +
          'A correctly placed corner forms a matching "U-shape" with the two adjacent sides. If one corner is placed, put it at the front-right as reference ' +
          'and repeat the algorithm until all 4 corners are placed; if none is placed, run the algorithm once to produce a reference corner.',
      },
      {
        anchor: 'll-edges',
        tab: 'Edges',
        title: '8. Step 7: position the top edges (finish)',
        body:
          'The last step places the 4 top edges to finish the cube. ' +
          'Turn the top layer until at least one side shows three matching colors (a full solid face). ' +
          'Put that finished face at your back, then run the algorithm to cycle the other three edges. ' +
          'If no side is aligned, run the algorithm once to get one aligned face, then repeat until solved.',
      },
    ],
  },
  update: {
    newVersion: 'New version available',
    updateNow: 'Update now',
  },
}
