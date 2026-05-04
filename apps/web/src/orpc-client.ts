import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
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
  ContractJungleMove,
  RollDiceOutput,
} from '@board-games/shared/contracts';

const apiUrl = import.meta.env.VITE_API_URL || '/rpc';
const link = new RPCLink({
  url: apiUrl.startsWith('http') ? apiUrl : `${window.location.origin}${apiUrl}`,
});

type AnyMove = ContractMove | ContractChessMove | ContractXiangqiMove | ContractGomokuMove | ContractGoMove | ContractLudoMove | ContractJungleMove;

type OrpcClient = {
  createGame: (input: {
    gameType?: 'draughts' | 'xiangqi' | 'chess' | 'gomoku' | 'go' | 'ludo' | 'jungle';
    boardSize?: 10 | 8 | 19 | 13 | 9 | 15;
    difficulty?: 'easy' | 'medium' | 'hard';
    humanColor?: 'dark' | 'light';
    humanGoesFirst?: boolean;
  }) => Promise<MakeMoveOutput>;
  getGame: (input: { gameId: string }) => Promise<GameResponse>;
  makeMove: (input: { gameId: string; move: AnyMove }) => Promise<MakeMoveOutput>;
  getValidMoves: (input: { gameId: string; pieceId: string }) => Promise<AnyMove[]>;
  rollDice: (input: { gameId: string }) => Promise<RollDiceOutput>;
  undoMove: (input: { gameId: string }) => Promise<GameResponse>;
  resignGame: (input: { gameId: string }) => Promise<GameResponse>;
  getMoveHistory: (input: { gameId: string }) => Promise<MoveRecord[]>;
  listGames: (input: { limit: number }) => Promise<GameResponse[]>;
};

export const orpc = createORPCClient(link as any) as OrpcClient;
