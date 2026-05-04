import { oc } from '@orpc/contract';
import { z } from 'zod';

export const PositionSchema = z.object({
  row: z.number().int().min(0),
  col: z.number().int().min(0),
});

export const MoveSchema = z.object({
  pieceId: z.string(),
  from: PositionSchema,
  to: PositionSchema,
  type: z.enum(['step', 'capture', 'chain_capture']),
  capturedPieceIds: z.array(z.string()),
  path: z.array(PositionSchema),
  promoted: z.boolean(),
});

export const ChessMoveSchema = z.object({
  pieceId: z.string(),
  from: PositionSchema,
  to: PositionSchema,
  type: z.enum(['normal', 'capture', 'castling', 'en_passant', 'promotion', 'promotion_capture']),
  capturedPieceId: z.string().nullable(),
  promotionPiece: z.enum(['queen', 'rook', 'bishop', 'knight']).nullable(),
  rookFrom: PositionSchema.nullable(),
  rookTo: PositionSchema.nullable(),
  rookId: z.string().nullable(),
});

export const XiangqiMoveSchema = z.object({
  pieceId: z.string(),
  from: PositionSchema,
  to: PositionSchema,
  type: z.enum(['normal', 'capture']),
  capturedPieceId: z.string().nullable(),
});

export const GomokuMoveSchema = z.object({
  stoneId: z.string(),
  to: PositionSchema,
  color: z.enum(['dark', 'light']),
});

const GoPositionSchema = z.object({
  row: z.number().int(),
  col: z.number().int(),
});

export const GoMoveSchema = z.object({
  stoneId: z.string(),
  to: GoPositionSchema,
  color: z.enum(['dark', 'light']),
  isPass: z.boolean(),
});

export const LudoMoveSchema = z.object({
  pieceId: z.string(),
  fromTrackIndex: z.number().int().min(-1).max(58),
  toTrackIndex: z.number().int().min(-1).max(58),
  diceValue: z.number().int().min(1).max(6),
  capturedPieceId: z.string().nullable(),
  enteredHomeStretch: z.boolean(),
  reachedGoal: z.boolean(),
});

export const JungleMoveSchema = z.object({
  pieceId: z.string(),
  from: PositionSchema,
  to: PositionSchema,
  type: z.enum(['normal', 'capture']),
  capturedPieceId: z.string().nullable(),
});

export const GameResponseSchema = z.object({
  id: z.string(),
  gameType: z.enum(['draughts', 'xiangqi', 'chess', 'gomoku', 'go', 'ludo', 'jungle']),
  status: z.enum(['in_progress', 'finished', 'abandoned']),
  currentPlayer: z.enum(['human', 'ai']),
  boardState: z.string(),
  humanColor: z.enum(['dark', 'light']),
  aiDifficulty: z.enum(['easy', 'medium', 'hard']),
  winner: z.enum(['human', 'ai', 'draw']).nullable(),
  moveCount: z.number(),
  drawReason: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const MoveRecordSchema = z.object({
  moveNumber: z.number(),
  player: z.enum(['human', 'ai']),
  from: PositionSchema,
  to: PositionSchema,
  moveType: z.string(),
  capturedCount: z.number(),
  promoted: z.boolean(),
  promotionTo: z.string().nullable(),
});

const MoveUnion = z.union([MoveSchema, ChessMoveSchema, XiangqiMoveSchema, GomokuMoveSchema, GoMoveSchema, LudoMoveSchema, JungleMoveSchema]);

const makeMoveOutputSchema = z.object({
  game: GameResponseSchema,
  aiMove: MoveUnion.nullable(),
  validMoves: z.array(MoveUnion),
  ludoAiTurns: z.array(z.object({
    playerIndex: z.number().int().min(0).max(3),
    diceValue: z.number().int().min(1).max(6),
    move: LudoMoveSchema.nullable(),
  })).optional(),
});

const rollDiceOutputSchema = z.object({
  game: GameResponseSchema,
  diceValue: z.number().int().min(1).max(6),
  validMoves: z.array(LudoMoveSchema),
});

export type GameResponse = z.infer<typeof GameResponseSchema>;
export type MoveRecord = z.infer<typeof MoveRecordSchema>;
export type MakeMoveOutput = z.infer<typeof makeMoveOutputSchema>;
export type RollDiceOutput = z.infer<typeof rollDiceOutputSchema>;
export type ContractMove = z.infer<typeof MoveSchema>;
export type ContractChessMove = z.infer<typeof ChessMoveSchema>;
export type ContractXiangqiMove = z.infer<typeof XiangqiMoveSchema>;
export type ContractGomokuMove = z.infer<typeof GomokuMoveSchema>;
export type ContractGoMove = z.infer<typeof GoMoveSchema>;
export type ContractLudoMove = z.infer<typeof LudoMoveSchema>;
export type ContractJungleMove = z.infer<typeof JungleMoveSchema>;

export const contract = {
  createGame: oc
    .input(z.object({
      gameType: z.enum(['draughts', 'xiangqi', 'chess', 'gomoku', 'go', 'ludo', 'jungle']).default('draughts'),
      boardSize: z.union([z.literal(10), z.literal(8), z.literal(19), z.literal(13), z.literal(9), z.literal(15)]).optional(),
      difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
      humanColor: z.enum(['dark', 'light']).default('dark'),
      humanGoesFirst: z.boolean().default(true),
    }))
    .output(makeMoveOutputSchema),

  getGame: oc
    .input(z.object({ gameId: z.string() }))
    .output(GameResponseSchema),

  makeMove: oc
    .input(z.object({
      gameId: z.string(),
      move: MoveUnion,
    }))
    .output(makeMoveOutputSchema),

  getValidMoves: oc
    .input(z.object({
      gameId: z.string(),
      pieceId: z.string(),
    }))
    .output(z.array(MoveUnion)),

  rollDice: oc
    .input(z.object({ gameId: z.string() }))
    .output(rollDiceOutputSchema),

  undoMove: oc
    .input(z.object({ gameId: z.string() }))
    .output(GameResponseSchema),

  resignGame: oc
    .input(z.object({ gameId: z.string() }))
    .output(GameResponseSchema),

  getMoveHistory: oc
    .input(z.object({ gameId: z.string() }))
    .output(z.array(MoveRecordSchema)),

  listGames: oc
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .output(z.array(GameResponseSchema)),
} as const;
