import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const games = sqliteTable('games', {
  id: text('id').primaryKey(),
  gameType: text('game_type').notNull().default('draughts'),
  status: text('status').notNull().default('in_progress'),
  currentPlayer: text('current_player').notNull().default('human'),
  boardState: text('board_state').notNull(),
  humanColor: text('human_color').notNull().default('dark'),
  aiDifficulty: text('ai_difficulty').notNull().default('medium'),
  winner: text('winner'),
  drawReason: text('draw_reason'),
  moveCount: integer('move_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const moves = sqliteTable('moves', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  gameId: text('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  moveNumber: integer('move_number').notNull(),
  player: text('player').notNull(),
  fromPos: text('from_pos').notNull(),
  toPos: text('to_pos').notNull(),
  moveType: text('move_type').notNull(),
  capturedPieces: text('captured_pieces').notNull().default('[]'),
  capturePath: text('capture_path'),
  promoted: integer('promoted', { mode: 'boolean' }).notNull().default(false),
  promotionTo: text('promotion_to'),
  boardStateAfter: text('board_state_after').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type MoveRecord = typeof moves.$inferSelect;
