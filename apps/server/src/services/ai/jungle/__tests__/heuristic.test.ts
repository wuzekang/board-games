import { describe, it, expect } from 'vitest';
import {
  createInitialJungleBoard,
  applyJungleMove,
  getAllJungleValidMoves,
  getJungleGameResult,
} from '@board-games/shared/jungle';
import {
  type JungleBoardState,
  type JunglePiece,
  type JungleMove,
  JunglePieceType,
  JungleMoveType,
  PieceColor,
} from '@board-games/shared/jungle';
import { evaluateJungleBoard, moveOrderScore, ratHuntScore } from '../heuristic';

function makeBoard(
  pieces: Array<{ type: JunglePieceType; color: PieceColor; row: number; col: number }>,
  nextColor: PieceColor = PieceColor.DARK,
): JungleBoardState {
  return {
    size: 7,
    rows: 9,
    pieces: pieces.map((p, i) => ({
      id: `jl${i + 1}`,
      type: p.type,
      color: p.color,
      position: { row: p.row, col: p.col },
    })),
    nextColor,
    halfMoveClock: 0,
  };
}

describe('evaluateJungleBoard', () => {
  it('v4 asymmetric evaluation: dark and light scores not exact negatives', () => {
    const board = createInitialJungleBoard();
    const scoreDark = evaluateJungleBoard(board, PieceColor.DARK);
    const scoreLight = evaluateJungleBoard(board, PieceColor.LIGHT);
    expect(scoreDark + scoreLight).not.toBe(0);
    expect(Math.abs(scoreDark)).toBeGreaterThan(0);
    expect(Math.abs(scoreLight)).toBeGreaterThan(0);
  });

  it('material advantage gives positive score', () => {
    const board = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 4, col: 3 },
      { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 5, col: 3 },
    ]);
    const score = evaluateJungleBoard(board, PieceColor.DARK);
    expect(score).toBeGreaterThan(0);
  });

  it('piece near opponent den scores higher than piece far away', () => {
    const close = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 1, col: 3 },
      { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 7, col: 3 },
    ]);
    const far = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 6, col: 3 },
      { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 7, col: 3 },
    ]);
    const closeScore = evaluateJungleBoard(close, PieceColor.DARK);
    const farScore = evaluateJungleBoard(far, PieceColor.DARK);
    expect(closeScore).toBeGreaterThan(farScore);
  });

  it('opponent near own den gives negative score', () => {
    const threatened = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
      { type: JunglePieceType.LION, color: PieceColor.DARK, row: 8, col: 0 },
    ]);
    const safe = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 4, col: 3 },
      { type: JunglePieceType.LION, color: PieceColor.DARK, row: 8, col: 0 },
    ]);
    const threatenedScore = evaluateJungleBoard(threatened, PieceColor.DARK);
    const safeScore = evaluateJungleBoard(safe, PieceColor.DARK);
    expect(safeScore).toBeGreaterThan(threatenedScore);
  });

  it('rat near enemy elephant is valued (rat hunt bonus)', () => {
    const ratClose = makeBoard([
      { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 4, col: 3 },
      { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 4, col: 4 },
    ]);
    const ratFar = makeBoard([
      { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 6, col: 0 },
      { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 4, col: 4 },
    ]);
    const closeScore = evaluateJungleBoard(ratClose, PieceColor.DARK);
    const farScore = evaluateJungleBoard(ratFar, PieceColor.DARK);
    expect(closeScore).toBeGreaterThan(farScore);
  });

  it('rat counter bonus: rat near enemy elephant gets hunt bonus', () => {
    const board = makeBoard([
      { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 2, col: 4 },
      { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 1, col: 5 },
    ]);
    const score = ratHuntScore(board, PieceColor.DARK);
    expect(score).toBeGreaterThan(0);
  });

  it('piece on opponent trap gets trap control bonus', () => {
    const onTrap = makeBoard([
      { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 1, col: 3 },
      { type: JunglePieceType.DOG, color: PieceColor.LIGHT, row: 7, col: 3 },
    ]);
    const notOnTrap = makeBoard([
      { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 2, col: 3 },
      { type: JunglePieceType.DOG, color: PieceColor.LIGHT, row: 7, col: 3 },
    ]);
    const onTrapScore = evaluateJungleBoard(onTrap, PieceColor.DARK);
    const notOnTrapScore = evaluateJungleBoard(notOnTrap, PieceColor.DARK);
    expect(onTrapScore).toBeGreaterThan(notOnTrapScore);
  });

  it('elephant without own rat but opponent rat alive is penalized', () => {
    const vulnerable = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 5, col: 3 },
      { type: JunglePieceType.RAT, color: PieceColor.LIGHT, row: 4, col: 3 },
    ]);
    const safe = makeBoard([
      { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 5, col: 3 },
      { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 4, col: 3 },
    ]);
    const vulnerableScore = evaluateJungleBoard(vulnerable, PieceColor.DARK);
    const safeScore = evaluateJungleBoard(safe, PieceColor.DARK);
    expect(safeScore).toBeGreaterThan(vulnerableScore);
  });

  it('rat in river has positional bonus', () => {
    const inRiver = makeBoard([
      { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 4, col: 1 },
      { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 5, col: 3 },
    ]);
    const onLand = makeBoard([
      { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 5, col: 1 },
      { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 5, col: 3 },
    ]);
    const inRiverScore = evaluateJungleBoard(inRiver, PieceColor.DARK);
    const onLandScore = evaluateJungleBoard(onLand, PieceColor.DARK);
    expect(inRiverScore).toBeGreaterThan(onLandScore);
  });

  describe('elephant direct attack scenarios', () => {
    it('elephant close to opponent den scores higher than elephant far away', () => {
      const close = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 1, col: 3 },
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      const far = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 5, col: 3 },
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      const closeScore = evaluateJungleBoard(close, PieceColor.DARK);
      const farScore = evaluateJungleBoard(far, PieceColor.DARK);
      expect(closeScore).toBeGreaterThan(farScore);
    });

    it('enemy elephant near own den gives large negative score', () => {
      const threatened = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 1, col: 3 },
      ]);
      const safe = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 3, col: 3 },
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 1, col: 3 },
      ]);
      const threatenedScore = evaluateJungleBoard(threatened, PieceColor.DARK);
      const safeScore = evaluateJungleBoard(safe, PieceColor.DARK);
      expect(safeScore - threatenedScore).toBeGreaterThan(200);
    });

    it('elephant on center column toward den scores higher than on side column', () => {
      const center = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 3, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      const side = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 3, col: 0 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      const centerScore = evaluateJungleBoard(center, PieceColor.DARK);
      const sideScore = evaluateJungleBoard(side, PieceColor.DARK);
      expect(centerScore).toBeGreaterThan(sideScore);
    });

    it('elephant advancing with own rat cover is valued over advancing alone', () => {
      const withCover = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 2, col: 3 },
        { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 3, col: 2 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      const alone = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 2, col: 3 },
        { type: JunglePieceType.RAT, color: PieceColor.LIGHT, row: 6, col: 2 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 7, col: 3 },
      ]);
      const withCoverScore = evaluateJungleBoard(withCover, PieceColor.DARK);
      const aloneScore = evaluateJungleBoard(alone, PieceColor.DARK);
      expect(withCoverScore).toBeGreaterThan(aloneScore);
    });

    it('enemy elephant near den with no own rat to counter is very dangerous', () => {
      const noCounter = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.TIGER, color: PieceColor.DARK, row: 4, col: 0 },
        { type: JunglePieceType.TIGER, color: PieceColor.LIGHT, row: 2, col: 0 },
      ]);
      const hasCounter = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.RAT, color: PieceColor.DARK, row: 6, col: 3 },
        { type: JunglePieceType.TIGER, color: PieceColor.DARK, row: 4, col: 0 },
        { type: JunglePieceType.TIGER, color: PieceColor.LIGHT, row: 2, col: 0 },
      ]);
      const noCounterScore = evaluateJungleBoard(noCounter, PieceColor.DARK);
      const hasCounterScore = evaluateJungleBoard(hasCounter, PieceColor.DARK);
      expect(hasCounterScore).toBeGreaterThan(noCounterScore);
    });

    it('elephant one step from opponent den scores extremely high', () => {
      const oneStep = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 1, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 5, col: 3 },
      ]);
      const threeSteps = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.DARK, row: 3, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 5, col: 3 },
      ]);
      const oneStepScore = evaluateJungleBoard(oneStep, PieceColor.DARK);
      const threeStepsScore = evaluateJungleBoard(threeSteps, PieceColor.DARK);
      expect(oneStepScore - threeStepsScore).toBeGreaterThan(100);
    });

    it('enemy piece adjacent to own den triggers huge shield penalty', () => {
      const adjacent = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.LION, color: PieceColor.DARK, row: 8, col: 0 },
      ]);
      const twoAway = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 6, col: 3 },
        { type: JunglePieceType.LION, color: PieceColor.DARK, row: 8, col: 0 },
      ]);
      const adjScore = evaluateJungleBoard(adjacent, PieceColor.DARK);
      const twoScore = evaluateJungleBoard(twoAway, PieceColor.DARK);
      expect(twoScore).toBeGreaterThan(adjScore);
    });

    it('den urgency compounds: multiple enemy pieces near den is catastrophic', () => {
      const oneThreat = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 4, col: 0 },
      ]);
      const twoThreats = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.LION, color: PieceColor.LIGHT, row: 7, col: 2 },
        { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 4, col: 0 },
      ]);
      const oneScore = evaluateJungleBoard(oneThreat, PieceColor.DARK);
      const twoScore = evaluateJungleBoard(twoThreats, PieceColor.DARK);
      expect(oneScore).toBeGreaterThan(twoScore);
    });

    it('den shield penalty scales with defense gap', () => {
      const tightThreat = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.LION, color: PieceColor.DARK, row: 8, col: 0 },
      ]);
      const distantThreat = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 5, col: 3 },
        { type: JunglePieceType.LION, color: PieceColor.DARK, row: 8, col: 0 },
      ]);
      const tightScore = evaluateJungleBoard(tightThreat, PieceColor.DARK);
      const distScore = evaluateJungleBoard(distantThreat, PieceColor.DARK);
      expect(distScore).toBeGreaterThan(tightScore);
    });

    it('elephant 5 from den still triggers urgency penalty', () => {
      const fiveAway = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 4, col: 3 },
        { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 6, col: 0 },
      ]);
      const farAway = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 2, col: 3 },
        { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 6, col: 0 },
      ]);
      const fiveScore = evaluateJungleBoard(fiveAway, PieceColor.DARK);
      const farScore = evaluateJungleBoard(farAway, PieceColor.DARK);
      expect(farScore).toBeGreaterThan(fiveScore);
    });

    it('moveOrderScore prioritizes capturing threat near own den', () => {
      const board = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.TIGER, color: PieceColor.DARK, row: 6, col: 3 },
        { type: JunglePieceType.DOG, color: PieceColor.DARK, row: 6, col: 0 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 2, col: 0 },
      ], PieceColor.DARK);
      const captureMove: JungleMove = {
        pieceId: 'jl2',
        from: { row: 6, col: 3 },
        to: { row: 7, col: 3 },
        type: JungleMoveType.CAPTURE,
        capturedPieceId: 'jl1',
      };
      const idleMove: JungleMove = {
        pieceId: 'jl3',
        from: { row: 6, col: 0 },
        to: { row: 5, col: 0 },
        type: JungleMoveType.NORMAL,
        capturedPieceId: null,
      };
      const captureScore = moveOrderScore(captureMove, board, PieceColor.DARK);
      const idleScore = moveOrderScore(idleMove, board, PieceColor.DARK);
      expect(captureScore).toBeGreaterThan(idleScore);
    });

    it('moveOrderScore prioritizes intercepting threat approaching den', () => {
      const board = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 6, col: 3 },
        { type: JunglePieceType.LION, color: PieceColor.DARK, row: 7, col: 2 },
        { type: JunglePieceType.CAT, color: PieceColor.LIGHT, row: 2, col: 0 },
      ], PieceColor.DARK);
      const interceptMove: JungleMove = {
        pieceId: 'jl2',
        from: { row: 7, col: 2 },
        to: { row: 6, col: 2 },
        type: JungleMoveType.NORMAL,
        capturedPieceId: null,
      };
      const wanderMove: JungleMove = {
        pieceId: 'jl2',
        from: { row: 7, col: 2 },
        to: { row: 8, col: 2 },
        type: JungleMoveType.NORMAL,
        capturedPieceId: null,
      };
      const interceptScore = moveOrderScore(interceptMove, board, PieceColor.DARK);
      const wanderScore = moveOrderScore(wanderMove, board, PieceColor.DARK);
      expect(interceptScore).toBeGreaterThan(wanderScore);
    });

    it('guard piece near den reduces threat gap', () => {
      const nearGuard = makeBoard([
        { type: JunglePieceType.TIGER, color: PieceColor.DARK, row: 7, col: 3 },
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 2 },
      ]);
      const farGuard = makeBoard([
        { type: JunglePieceType.TIGER, color: PieceColor.DARK, row: 4, col: 3 },
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 2 },
      ]);
      const nearScore = evaluateJungleBoard(nearGuard, PieceColor.DARK);
      const farScore = evaluateJungleBoard(farGuard, PieceColor.DARK);
      expect(nearScore).toBeGreaterThan(farScore);
    });

    it('elephant far away with no defender is worse than with defender', () => {
      const noDefender = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 5, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.DARK, row: 7, col: 5 },
      ]);
      const hasDefender = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 5, col: 3 },
        { type: JunglePieceType.TIGER, color: PieceColor.DARK, row: 6, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.DARK, row: 7, col: 5 },
      ]);
      const noDefScore = evaluateJungleBoard(noDefender, PieceColor.DARK);
      const hasDefScore = evaluateJungleBoard(hasDefender, PieceColor.DARK);
      expect(hasDefScore).toBeGreaterThan(noDefScore);
    });

    it('enemy piece adjacent to own den is catastrophic', () => {
      const gap0 = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 7, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.DARK, row: 7, col: 5 },
      ]);
      const safe = makeBoard([
        { type: JunglePieceType.ELEPHANT, color: PieceColor.LIGHT, row: 2, col: 3 },
        { type: JunglePieceType.CAT, color: PieceColor.DARK, row: 7, col: 5 },
      ]);
      const gap0Score = evaluateJungleBoard(gap0, PieceColor.DARK);
      const safeScore = evaluateJungleBoard(safe, PieceColor.DARK);
      expect(safeScore - gap0Score).toBeGreaterThan(5000);
    });
  });
});
