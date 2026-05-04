import { nanoid } from 'nanoid';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client';
import { games, moves, type Game } from '../db/schema';
import { PieceColor } from '@board-games/shared';
import { getStrategy } from './strategies/registry';
import type {
  GameResponse,
  MakeMoveOutput,
  MoveRecord,
  ContractMove,
  ContractChessMove,
  ContractXiangqiMove,
  ContractGomokuMove,
  ContractGoMove,
  ContractLudoMove,
  RollDiceOutput,
} from '@board-games/shared/contracts';
import type {
  LudoBoardState,
  AnyLudoMove,
  LudoPlayerIndex,
} from '@board-games/shared/ludo';
import {
  rollDice as rollDiceShared,
  nextPlayerIndex,
  getLudoGameResult,
} from '@board-games/shared/ludo';

type AnyMove = Record<string, any>;
type ContractAnyMove = ContractMove | ContractChessMove | ContractXiangqiMove | ContractGomokuMove | ContractGoMove | ContractLudoMove;

const locks = new Map<string, Promise<void>>();

export type { AnyMove };

function toContractMove(m: AnyMove): ContractAnyMove {
  if ('isPass' in m) return m as ContractGoMove;
  if ('fromTrackIndex' in m && 'diceValue' in m) return m as ContractLudoMove;
  if ('stoneId' in m) return m as ContractGomokuMove;
  if ('capturedPieceId' in m && 'rookFrom' in m) {
    return { ...m, type: m.type, promotionPiece: m.promotionPiece ?? null } as ContractChessMove;
  }
  if ('capturedPieceId' in m) {
    return { ...m } as ContractXiangqiMove;
  }
  return { ...m, type: m.type } as ContractMove;
}

function toContractMoves(ms: AnyMove[]): ContractAnyMove[] {
  return ms.map(toContractMove);
}

function gameToResponse(game: Game): GameResponse {
  return {
    id: game.id,
    gameType: game.gameType as GameResponse['gameType'],
    status: game.status as GameResponse['status'],
    currentPlayer: game.currentPlayer as GameResponse['currentPlayer'],
    boardState: game.boardState,
    humanColor: game.humanColor as GameResponse['humanColor'],
    aiDifficulty: game.aiDifficulty as GameResponse['aiDifficulty'],
    winner: game.winner as GameResponse['winner'],
    moveCount: game.moveCount,
    drawReason: game.drawReason,
    createdAt: Math.floor(new Date(game.createdAt).getTime() / 1000),
    updatedAt: Math.floor(new Date(game.updatedAt).getTime() / 1000),
  };
}

function colorFromString(c: string): PieceColor {
  return c === 'dark' ? PieceColor.DARK : PieceColor.LIGHT;
}

function colorToString(c: PieceColor): string {
  return c === PieceColor.DARK ? 'dark' : 'light';
}

function opponentColor(color: PieceColor): PieceColor {
  return color === PieceColor.DARK ? PieceColor.LIGHT : PieceColor.DARK;
}

export async function createGame(input: {
  gameType?: string;
  boardSize?: 10 | 8 | 19 | 13 | 9 | 15;
  difficulty: string;
  humanColor: string;
  humanGoesFirst: boolean;
}): Promise<MakeMoveOutput> {
  const gameType = input.gameType || 'draughts';
  const strategy = getStrategy(gameType, input.boardSize as number | undefined);
  const humanColor = colorFromString(input.humanColor);

  const board = strategy.createBoard(
    gameType === 'draughts'
      ? { boardSize: input.boardSize ?? 10 }
      : undefined,
  );

  const id = nanoid(10);

  const [game] = await db.insert(games).values({
    id,
    gameType,
    status: 'in_progress',
    currentPlayer: input.humanGoesFirst ? 'human' : 'ai',
    boardState: JSON.stringify(board),
    humanColor: input.humanColor,
    aiDifficulty: input.difficulty,
    moveCount: 0,
  }).returning();

  let aiMove: AnyMove | null = null;
  let currentBoard = board;
  if (!input.humanGoesFirst) {
    const aiColor = opponentColor(humanColor);
    aiMove = strategy.getAiMove(currentBoard, aiColor, input.difficulty);
    if (aiMove) {
      currentBoard = strategy.applyMove(currentBoard, aiMove);
      const resolved = strategy.resolveWinner(currentBoard, humanColor);
      await db.insert(moves).values({
        gameId: id,
        moveNumber: 1,
        player: 'ai',
        boardStateAfter: JSON.stringify(currentBoard),
        ...strategy.buildMoveInsert(aiMove, currentBoard),
      });

      const updateData: any = {
        currentPlayer: 'human',
        boardState: JSON.stringify(currentBoard),
        moveCount: 1,
        status: resolved.isDraw || resolved.winner ? 'finished' : 'in_progress',
        updatedAt: new Date(),
      };
      if (resolved.winner) {
        updateData.winner = resolved.winner === humanColor ? 'human' : 'ai';
      }
      if (resolved.isDraw) {
        updateData.winner = 'draw';
        updateData.drawReason = resolved.drawReason || null;
      }
      await db.update(games).set(updateData).where(eq(games.id, id));
    }
  }

  const updated = await db.select().from(games).where(eq(games.id, id)).limit(1);
  const validMoves = strategy.getAllValidMoves(currentBoard, humanColor);

  return {
    game: gameToResponse(updated[0]),
    aiMove: aiMove ? toContractMove(aiMove) : null,
    validMoves: toContractMoves(validMoves),
  };
}

export async function getGame(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new Error('Game not found');
  return gameToResponse(game);
}

export async function makeMove(gameId: string, move: AnyMove): Promise<MakeMoveOutput> {
  const prev = locks.get(gameId) ?? Promise.resolve();
  let resolve!: () => void;
  const next = new Promise<void>((r) => { resolve = r; });
  locks.set(gameId, next);
  await prev;
  try {
    return await makeMoveInner(gameId, move);
  } finally {
    resolve();
    if (locks.get(gameId) === next) locks.delete(gameId);
  }
}

async function makeMoveInner(gameId: string, move: AnyMove): Promise<MakeMoveOutput> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new Error('Game not found');
  if (game.status !== 'in_progress') throw new Error('Game is not in progress');
  if (game.currentPlayer !== 'human') throw new Error('Not your turn');

  const board = JSON.parse(game.boardState);
  const strategy = getStrategy(game.gameType, board.size as number | undefined);
  const humanColor = colorFromString(game.humanColor);

  if (!strategy.isValidMove(board, move, humanColor)) {
    throw new Error('Invalid move');
  }

  let currentBoard = strategy.applyMove(board, move);
  const nextColor = opponentColor(humanColor);
  const humanResolved = strategy.resolveWinner(currentBoard, nextColor);

  await db.insert(moves).values({
    gameId,
    moveNumber: game.moveCount + 1,
    player: 'human' as const,
    boardStateAfter: JSON.stringify(currentBoard),
    ...strategy.buildMoveInsert(move, currentBoard),
  });

  let aiMove: AnyMove | null = null;
  let ludoAiTurns: Array<{ playerIndex: number; diceValue: number; move: AnyLudoMove | null }> | undefined;

  if (!humanResolved.winner && !humanResolved.isDraw) {
    if (game.gameType === 'ludo') {
      const ludoResult = await runLudoAiTurns(currentBoard, game.aiDifficulty, gameId, game.moveCount + 1);
      currentBoard = ludoResult.board;
      ludoAiTurns = ludoResult.turns;
    } else {
      const aiColor = opponentColor(humanColor);
      aiMove = strategy.getAiMove(currentBoard, aiColor, game.aiDifficulty);

      if (aiMove) {
        currentBoard = strategy.applyMove(currentBoard, aiMove);
        await db.insert(moves).values({
          gameId,
          moveNumber: game.moveCount + 2,
          player: 'ai' as const,
          boardStateAfter: JSON.stringify(currentBoard),
          ...strategy.buildMoveInsert(aiMove, currentBoard),
        });
      }
    }
  }

  const aiNextColor = humanColor;
  const finalResolved =
    humanResolved.winner || humanResolved.isDraw
      ? humanResolved
      : aiMove
        ? strategy.resolveWinner(currentBoard, aiNextColor)
        : game.gameType === 'ludo'
          ? strategy.resolveWinner(currentBoard, (currentBoard as LudoBoardState).currentPlayerIndex === 0 ? humanColor : opponentColor(humanColor))
          : { winner: null, isDraw: false };

  const totalMoves = game.gameType === 'ludo'
    ? game.moveCount + 1 + (ludoAiTurns?.length ?? 0)
    : game.moveCount + (aiMove ? 2 : 1);

  const updateData: any = {
    currentPlayer: 'human',
    boardState: JSON.stringify(currentBoard),
    moveCount: totalMoves,
    status: finalResolved.winner || finalResolved.isDraw ? 'finished' : 'in_progress',
    updatedAt: new Date(),
  };
  if (finalResolved.winner) {
    updateData.winner = finalResolved.winner === humanColor ? 'human' : 'ai';
  }
  if (finalResolved.isDraw) {
    updateData.winner = 'draw';
    updateData.drawReason = finalResolved.drawReason || null;
  }
  await db.update(games).set(updateData).where(eq(games.id, gameId));

  const [updated] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  const validMoves = strategy.getAllValidMoves(currentBoard, humanColor);

  const result: MakeMoveOutput = {
    game: gameToResponse(updated),
    aiMove: aiMove ? toContractMove(aiMove) : null,
    validMoves: toContractMoves(validMoves),
  };
  if (ludoAiTurns) {
    (result as any).ludoAiTurns = ludoAiTurns.map((t) => ({
      playerIndex: t.playerIndex,
      diceValue: t.diceValue,
      move: t.move ? (toContractMove(t.move) as ContractLudoMove) : null,
    }));
  }
  return result;
}

async function runLudoAiTurns(
  board: LudoBoardState,
  difficulty: string,
  gameId: string,
  startMoveNumber: number,
): Promise<{ board: LudoBoardState; turns: Array<{ playerIndex: number; diceValue: number; move: AnyLudoMove | null }> }> {
  let currentBoard = { ...board };
  const turns: Array<{ playerIndex: number; diceValue: number; move: AnyLudoMove | null }> = [];
  const strategy = getStrategy('ludo');
  let moveNumber = startMoveNumber + 1;

  while (currentBoard.currentPlayerIndex !== 0) {
    const playerIdx = currentBoard.currentPlayerIndex;
    const dice = rollDiceShared();

    if (dice === 6 && currentBoard.consecutiveSixes >= 2) {
      currentBoard = {
        ...currentBoard,
        diceValue: null,
        consecutiveSixes: 0,
        currentPlayerIndex: nextPlayerIndex(currentBoard.currentPlayerIndex),
      };
      turns.push({ playerIndex: playerIdx, diceValue: dice, move: null });
      continue;
    }

    currentBoard = {
      ...currentBoard,
      diceValue: dice,
    };

    const aiMove = strategy.getAiMove(currentBoard, PieceColor.LIGHT, difficulty) as AnyLudoMove | null;

    if (aiMove) {
      currentBoard = strategy.applyMove(currentBoard, aiMove) as LudoBoardState;
      await db.insert(moves).values({
        gameId,
        moveNumber,
        player: 'ai',
        boardStateAfter: JSON.stringify(currentBoard),
        ...strategy.buildMoveInsert(aiMove, currentBoard),
      });
      moveNumber++;
    }

    turns.push({ playerIndex: playerIdx, diceValue: dice, move: aiMove });

    const result = getLudoGameResult(currentBoard);
    if (result) break;

    if (dice === 6 && aiMove && aiMove.pieceId !== '' && currentBoard.currentPlayerIndex === playerIdx) {
      continue;
    }
  }

  return { board: currentBoard, turns };
}

export async function rollDiceForGame(gameId: string): Promise<RollDiceOutput> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new Error('Game not found');
  if (game.status !== 'in_progress') throw new Error('Game is not in progress');
  if (game.gameType !== 'ludo') throw new Error('rollDice only valid for Ludo');
  if (game.currentPlayer !== 'human') throw new Error('Not your turn');

  const board: LudoBoardState = JSON.parse(game.boardState);
  if (board.diceValue !== null) throw new Error('Already rolled — make your move');

  const diceValue = rollDiceShared();

  let updatedBoard: LudoBoardState = {
    ...board,
    diceValue,
  };

  let aiTurnCount = 0;
  if (diceValue === 6 && board.consecutiveSixes >= 2) {
    updatedBoard = {
      ...board,
      diceValue: null,
      consecutiveSixes: 0,
      currentPlayerIndex: nextPlayerIndex(board.currentPlayerIndex),
    };

    const ludoResult = await runLudoAiTurns(updatedBoard, game.aiDifficulty, gameId, game.moveCount);
    updatedBoard = ludoResult.board;
    aiTurnCount = ludoResult.turns.length;
  }

  await db.update(games).set({
    boardState: JSON.stringify(updatedBoard),
    currentPlayer: updatedBoard.currentPlayerIndex === 0 ? 'human' : 'ai',
    moveCount: game.moveCount + aiTurnCount,
    updatedAt: new Date(),
  }).where(eq(games.id, gameId));

  const [updated] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  const strategy = getStrategy('ludo');
  const validMoves =
    updatedBoard.diceValue !== null
      ? (strategy.getAllValidMoves(updatedBoard, PieceColor.DARK) as AnyLudoMove[])
      : [];

  return {
    game: gameToResponse(updated),
    diceValue: updatedBoard.diceValue ?? diceValue,
    validMoves: toContractMoves(validMoves) as ContractLudoMove[],
  };
}

export async function getValidMoves(gameId: string, pieceId: string): Promise<ContractAnyMove[]> {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new Error('Game not found');
  const board = JSON.parse(game.boardState);
  const strategy = getStrategy(game.gameType, board.size as number | undefined);
  const humanColor = colorFromString(game.humanColor);

  if (game.gameType === 'gomoku' || game.gameType === 'ludo') {
    return toContractMoves(strategy.getAllValidMoves(board, humanColor));
  }
  return toContractMoves(strategy.getValidMovesForPiece(board, pieceId));
}

export async function undoMove(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new Error('Game not found');
  if (game.status !== 'in_progress') throw new Error('Game is not in progress');

  const gameMoves = await db.select().from(moves)
    .where(eq(moves.gameId, gameId))
    .orderBy(desc(moves.moveNumber))
    .limit(3);

  if (gameMoves.length < 2) throw new Error('No moves to undo');

  const movesToDelete = gameMoves.slice(0, 2);
  for (const m of movesToDelete) {
    await db.delete(moves).where(eq(moves.id, m.id));
  }

  let prevState: any;
  if (gameMoves.length >= 3) {
    prevState = JSON.parse(gameMoves[2].boardStateAfter);
  } else {
    const strategy = getStrategy(game.gameType);
    prevState = strategy.createBoard(
      game.gameType === 'draughts'
        ? { boardSize: JSON.parse(game.boardState).size as number }
        : undefined,
    );
  }

  await db.update(games).set({
    currentPlayer: 'human',
    boardState: JSON.stringify(prevState),
    moveCount: game.moveCount - 2,
    status: 'in_progress',
    winner: null,
    drawReason: null,
    updatedAt: new Date(),
  }).where(eq(games.id, gameId));

  const [updated] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return gameToResponse(updated);
}

export async function resignGame(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  if (!game) throw new Error('Game not found');
  if (game.status !== 'in_progress') throw new Error('Game is not in progress');

  await db.update(games).set({
    status: 'finished',
    winner: 'ai',
    updatedAt: new Date(),
  }).where(eq(games.id, gameId));

  const [updated] = await db.select().from(games).where(eq(games.id, gameId)).limit(1);
  return gameToResponse(updated);
}

export async function getMoveHistory(gameId: string): Promise<MoveRecord[]> {
  const gameMoves = await db.select().from(moves)
    .where(eq(moves.gameId, gameId))
    .orderBy(moves.moveNumber);

  return gameMoves.map((m) => ({
    moveNumber: m.moveNumber,
    player: m.player as 'human' | 'ai',
    from: JSON.parse(m.fromPos),
    to: JSON.parse(m.toPos),
    moveType: m.moveType,
    capturedCount: JSON.parse(m.capturedPieces).length,
    promoted: m.promoted,
    promotionTo: m.promotionTo,
  }));
}

export async function listGames(limit: number): Promise<GameResponse[]> {
  const result = await db.select().from(games)
    .orderBy(desc(games.createdAt))
    .limit(limit);
  return result.map(gameToResponse);
}
