import type { PieceColor } from '@board-games/shared';
import {
  type JungleBoardState,
  type JungleMove,
  JunglePieceType,
  JungleMoveType,
  PieceColor as PC,
  JUNGLE_PIECE_RANK,
} from '@board-games/shared/jungle';
import {
  getAllJungleValidMoves,
  applyJungleMove,
  getJungleGameResult,
} from '@board-games/shared/jungle';
import { evaluateJungleBoard, moveOrderScore } from './heuristic';
import type { AIEngine } from '../interface';

interface MCTSConfig {
  iterations: number;
  c: number;
  rolloutDepth: number;
}

const MCTS_CONFIG: Record<string, MCTSConfig> = {
  easy: { iterations: 150, c: 1.8, rolloutDepth: 20 },
  medium: { iterations: 500, c: 1.414, rolloutDepth: 30 },
  hard: { iterations: 1200, c: 1.0, rolloutDepth: 40 },
};

const DEFAULT_CONFIG: MCTSConfig = MCTS_CONFIG.medium;

type SimResult = 1 | 0 | 0.5;

const LIGHT_DEN: { row: number; col: number } = { row: 0, col: 3 };
const DARK_DEN: { row: number; col: number } = { row: 8, col: 3 };

function opponentOf(color: PieceColor): PieceColor {
  return color === PC.DARK ? PC.LIGHT : PC.DARK;
}

function opponentDen(color: PieceColor): { row: number; col: number } {
  return color === PC.DARK ? LIGHT_DEN : DARK_DEN;
}

class MCTSNode {
  board: JungleBoardState;
  move: JungleMove | null;
  parent: MCTSNode | null;
  children: MCTSNode[];
  untriedMoves: JungleMove[] | null;
  visits: number;
  wins: number;

  constructor(board: JungleBoardState, move: JungleMove | null, parent: MCTSNode | null) {
    this.board = board;
    this.move = move;
    this.parent = parent;
    this.children = [];
    this.untriedMoves = null;
    this.visits = 0;
    this.wins = 0;
  }

  ensureExpanded(aiColor: PieceColor): void {
    if (this.untriedMoves !== null) return;
    const moves = getAllJungleValidMoves(this.board, this.board.nextColor);
    this.untriedMoves = moves.sort(
      (a, b) => moveOrderScore(b, this.board, aiColor) - moveOrderScore(a, this.board, aiColor),
    );
  }

  get isFullyExpanded(): boolean {
    return this.untriedMoves !== null && this.untriedMoves.length === 0;
  }
}

function fastRolloutPick(
  board: JungleBoardState,
  moves: JungleMove[],
  currentColor: PieceColor,
): JungleMove {
  const den = opponentDen(currentColor);
  const captures: JungleMove[] = [];
  const normals: JungleMove[] = [];

  for (const m of moves) {
    if (m.to.row === den.row && m.to.col === den.col) return m;
    if (m.type === JungleMoveType.CAPTURE) captures.push(m);
    else normals.push(m);
  }

  if (captures.length > 0 && Math.random() < 0.85) {
    if (captures.length === 1) return captures[0];
    return captures[Math.floor(Math.random() * captures.length)];
  }

  return normals[Math.floor(Math.random() * normals.length)];
}

function simulate(
  startBoard: JungleBoardState,
  aiColor: PieceColor,
  depthCap: number,
): SimResult {
  let board = startBoard;
  let depth = 0;

  while (depth < depthCap) {
    const currentColor = board.nextColor;
    const result = getJungleGameResult(board, currentColor);
    if (result) {
      if (result.isDraw) return 0.5;
      return result.winner === aiColor ? 1 : 0;
    }

    const moves = getAllJungleValidMoves(board, currentColor);
    if (moves.length === 0) {
      return currentColor === aiColor ? 0 : 1;
    }

    const move = fastRolloutPick(board, moves, currentColor);
    board = applyJungleMove(board, move);
    depth++;

    if (depth > 8 && depth % 4 === 0) {
      const score = evaluateJungleBoard(board, aiColor);
      if (score > 3000) return 1;
      if (score < -3000) return 0;
    }
  }

  const score = evaluateJungleBoard(board, aiColor);
  if (score > 1500) return 1;
  if (score < -1500) return 0;
  return 0.5;
}

function selectNode(node: MCTSNode, c: number, aiColor: PieceColor): MCTSNode {
  let current = node;
  while (true) {
    current.ensureExpanded(aiColor);
    if (!current.isFullyExpanded) return current;
    if (current.children.length === 0) return current;

    let bestChild = current.children[0];
    let bestUCB = -Infinity;

    for (const child of current.children) {
      const isAITurn = child.board.nextColor !== aiColor;
      const exploit = isAITurn
        ? child.wins / child.visits
        : 1 - child.wins / child.visits;
      const explore = c * Math.sqrt(Math.log(current.visits) / child.visits);
      const ucb = exploit + explore;
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestChild = child;
      }
    }

    current = bestChild;

    const result = getJungleGameResult(current.board, current.board.nextColor);
    if (result) return current;
  }
}

function expand(node: MCTSNode, aiColor: PieceColor): MCTSNode {
  node.ensureExpanded(aiColor);
  if (node.untriedMoves!.length === 0) return node;

  const move = node.untriedMoves!.shift()!;
  const newBoard = applyJungleMove(node.board, move);
  const child = new MCTSNode(newBoard, move, node);
  node.children.push(child);
  return child;
}

function backpropagate(node: MCTSNode, result: SimResult, aiColor: PieceColor): void {
  let current: MCTSNode | null = node;
  while (current !== null) {
    current.visits++;
    if (current.parent !== null) {
      const moverColor = current.parent.board.nextColor;
      current.wins += moverColor === aiColor ? result : (1 - result);
    } else {
      current.wins += result;
    }
    current = current.parent;
  }
}

function bestChildByVisits(node: MCTSNode): MCTSNode {
  let best = node.children[0];
  for (const child of node.children) {
    if (child.visits > best.visits) best = child;
  }
  return best;
}

export class JungleMCTS implements AIEngine<JungleBoardState, JungleMove> {
  private difficulty: string;

  constructor(difficulty: string) {
    this.difficulty = difficulty;
  }

  getBestMove(board: JungleBoardState, aiColor: PieceColor): JungleMove | null {
    const moves = getAllJungleValidMoves(board, aiColor);
    if (moves.length === 0) return null;
    if (moves.length === 1) return moves[0];

    const den = opponentDen(aiColor);
    for (const m of moves) {
      if (m.to.row === den.row && m.to.col === den.col) return m;
    }

    const config = MCTS_CONFIG[this.difficulty] ?? DEFAULT_CONFIG;
    const root = new MCTSNode(board, null, null);

    for (let i = 0; i < config.iterations; i++) {
      const selected = selectNode(root, config.c, aiColor);

      const gameResult = getJungleGameResult(selected.board, selected.board.nextColor);
      let leaf: MCTSNode;
      let simResult: SimResult;

      if (gameResult) {
        leaf = selected;
        simResult = gameResult.isDraw
          ? 0.5
          : gameResult.winner === aiColor ? 1 : 0;
      } else if (selected.visits === 0) {
        leaf = selected;
        simResult = simulate(selected.board, aiColor, config.rolloutDepth);
      } else {
        leaf = expand(selected, aiColor);
        simResult = simulate(leaf.board, aiColor, config.rolloutDepth);
      }

      backpropagate(leaf, simResult, aiColor);
    }

    if (root.children.length === 0) return moves[0];
    return bestChildByVisits(root).move;
  }
}
