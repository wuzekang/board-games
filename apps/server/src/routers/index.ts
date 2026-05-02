import { implement, ORPCError } from '@orpc/server';
import { contract } from '@board-games/shared/contracts';
import type { AnyMove } from '../services/game.service';
import * as gameService from '../services/game.service';

const os = implement(contract);

export const router = os.router({
  createGame: os.createGame.handler(async ({ input }) => {
    return gameService.createGame(input as any);
  }),

  getGame: os.getGame.handler(async ({ input }) => {
    const result = await gameService.getGame(input.gameId);
    if (!result) throw new ORPCError('NOT_FOUND', { message: 'Game not found' });
    return result;
  }),

  makeMove: os.makeMove.handler(async ({ input }) => {
    try {
      return await gameService.makeMove(input.gameId, input.move as AnyMove);
    } catch (e: any) {
      if (e.message === 'Game not found') throw new ORPCError('NOT_FOUND', { message: e.message });
      if (e.message === 'Invalid move') throw new ORPCError('PRECONDITION_FAILED', { message: e.message });
      if (e.message === 'Game is not in progress' || e.message === 'Not your turn')
        throw new ORPCError('PRECONDITION_FAILED', { message: e.message });
      throw e;
    }
  }),

  getValidMoves: os.getValidMoves.handler(async ({ input }) => {
    try {
      return await gameService.getValidMoves(input.gameId, input.pieceId);
    } catch (e: any) {
      if (e.message === 'Game not found') throw new ORPCError('NOT_FOUND', { message: e.message });
      throw e;
    }
  }),

  rollDice: os.rollDice.handler(async ({ input }) => {
    try {
      return await gameService.rollDiceForGame(input.gameId);
    } catch (e: any) {
      if (e.message === 'Game not found') throw new ORPCError('NOT_FOUND', { message: e.message });
      throw new ORPCError('PRECONDITION_FAILED', { message: e.message });
    }
  }),

  undoMove: os.undoMove.handler(async ({ input }) => {
    try {
      return await gameService.undoMove(input.gameId);
    } catch (e: any) {
      if (e.message === 'Game not found') throw new ORPCError('NOT_FOUND', { message: e.message });
      if (e.message === 'No moves to undo' || e.message === 'Game is not in progress')
        throw new ORPCError('PRECONDITION_FAILED', { message: e.message });
      throw e;
    }
  }),

  resignGame: os.resignGame.handler(async ({ input }) => {
    try {
      return await gameService.resignGame(input.gameId);
    } catch (e: any) {
      if (e.message === 'Game not found') throw new ORPCError('NOT_FOUND', { message: e.message });
      if (e.message === 'Game is not in progress')
        throw new ORPCError('PRECONDITION_FAILED', { message: e.message });
      throw e;
    }
  }),

  getMoveHistory: os.getMoveHistory.handler(async ({ input }) => {
    return gameService.getMoveHistory(input.gameId);
  }),

  listGames: os.listGames.handler(async ({ input }) => {
    return gameService.listGames(input.limit);
  }),
});
