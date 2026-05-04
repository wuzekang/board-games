# AGENTS.md

## Project Overview

Board games (棋类游戏) browser platform. Human vs AI. Built as a pnpm monorepo. Currently supports International Draughts (国际跳棋, 100格/64格), Chess (国际象棋), and Gomoku (五子棋, 15x15).

## Architecture

- **apps/web** — React 19 + Vite SPA (port 5173). React Router, TanStack React Query, Tailwind CSS v4, oRPC client.
- **apps/server** — Hono server (port 3001). oRPC server, Drizzle ORM + SQLite (`apps/server/data/board-games.db`), tsup bundles to single `dist/index.js`.
- **packages/shared** — Shared TypeScript library: game rules, types, contracts. The single source of truth for board logic.

Client-server communication uses oRPC (type-safe RPC over HTTP) at `POST /rpc/{method}`.

## Key Commands

```bash
pnpm dev          # Start both server + web concurrently
pnpm build        # Build order: shared -> server -> web
```

No test runner configured.

## Shared Package Exports

- `@board-games/shared` — Types only (Position, PieceColor, PieceType, GameType, BoardState, Move, etc.)
- `@board-games/shared/draughts` — Draughts rules (createInitialBoard, getAllValidMoves, isValidMove, applyMove, checkWin, etc.)
- `@board-games/shared/chess` — Chess rules & types (ChessPieceType, ChessBoardState, ChessMove, createInitialChessBoard, isValidChessMove, applyChessMove, getChessGameResult, isInCheck, etc.)
- `@board-games/shared/gomoku` — Gomoku rules & types (GomokuStone, GomokuBoardState, GomokuMove, createInitialGomokuBoard, isValidGomokuMove, applyGomokuMove, getGomokuGameResult, etc.)
- `@board-games/shared/go` — Go rules & types (GoStone, GoBoardState, GoMove, GoScore, createInitialGoBoard, isValidGoMove, applyGoMove, getAllValidGoMoves, getGoGameResult, etc.)
- `@board-games/shared/contracts` — Zod API contract schemas

**Important**: Draughts, Chess, Gomoku, and Go have separate, independent type systems. Do not mix `BoardState`/`Move` with `ChessBoardState`/`ChessMove`, `GomokuBoardState`/`GomokuMove`, or `GoBoardState`/`GoMove`. The boundary is the JSON blob in the DB — the server never inspects piece types directly.

## API Endpoints (POST /rpc/…)

- `createGame` — `{ gameType: 'draughts'|'xiangqi'|'chess'|'gomoku'|'go', boardSize?: 10|8|19|13|9, difficulty: string, humanColor: string, humanGoesFirst: bool }`
- `getGame` — `{ gameId }`
- `makeMove` — `{ gameId, move }` (move shape varies by game type — Move for draughts, ChessMove for chess, GomokuMove for gomoku, GoMove for go)
- `getValidMoves` — `{ gameId, pieceId }`
- `undoMove` — `{ gameId }`
- `resignGame` — `{ gameId }`
- `getMoveHistory` — `{ gameId }`
- `listGames` — `{ limit }`

## Board Representation

- Board stored as JSON string in DB, deserialized via `JSON.parse()`.
- **Draughts**: `BoardState = { size: 8|10, pieces: Piece[] }`. Piece IDs (`p1`, `p2`…) assigned sequentially.
- **Chess**: `ChessBoardState = { size: 8, pieces: ChessPiece[], enPassantTarget: Position|null, halfMoveClock: number, fullMoveNumber: number }`. Piece IDs (`cp1`, `cp2`…) assigned sequentially. `hasMoved` flag on each piece tracks castling rights.
- **Gomoku**: `GomokuBoardState = { size: 15, stones: GomokuStone[], nextColor: PieceColor }`. Stone IDs (`gs1`, `gs2`…) assigned sequentially on `applyGomokuMove`. `nextColor` tracks whose turn (starts DARK/Black). No captures, no piece type differentiation — all stones are equal.
- **Go**: `GoBoardState = { size: 9|13|19, stones: GoStone[], nextColor: PieceColor, koPoint: Position|null, consecutivePasses: number, capturedByDark: number, capturedByLight: number }`. Stone IDs (`go1`, `go2`…) assigned sequentially. `nextColor` tracks whose turn (starts DARK/Black). `koPoint` enforces Simple Ko rule. `consecutivePasses` triggers game end at 2. Chinese rules (area scoring): komi 7.5 for 19×19, 5.5 otherwise.

## Game Type Dispatch (Server)

Game service uses **Strategy pattern** via `getStrategy(gameType)` from `apps/server/src/services/strategies/registry.ts`:

| gameType | Strategy Class | File |
|----------|---------------|------|
| `draughts` | `DraughtsStrategy(boardSize)` | `strategies/draughts.strategy.ts` |
| `xiangqi` | `XiangqiStrategy` | `strategies/xiangqi.strategy.ts` |
| `chess` | `ChessStrategy` | `strategies/chess.strategy.ts` |
| `gomoku` | `GomokuStrategy` | `strategies/gomoku.strategy.ts` |
| `go` | `GoStrategy(boardSize)` | `strategies/go.strategy.ts` |

Each strategy implements `GameStrategy<B, M>` (defined in `strategies/interface.ts`) with methods: `createBoard`, `isValidMove`, `applyMove`, `getAllValidMoves`, `getValidMovesForPiece`, `resolveWinner`, `buildMoveInsert`, `getAiMove`. The service never contains game-specific if/else — it calls `strategy.method()` uniformly.

AI dispatch uses generic `AIEngine<B, M>` (defined in `services/ai/interface.ts`). Factory functions `createDraughtsAI`/`createChessAI`/`createGomokuAI`/`createGoAI` each return properly typed instances. Strategies internally call these factories in `getAiMove`.

## Draughts Rules (packages/shared/src/draughts/rules.ts)

- **Forced capture**: If any piece of the current color has a capture move, all non-capture moves are invalid. This is enforced globally in `getAllValidMoves()` and `getValidMovesForPiece()`.
- **Max capture**: When captures exist, only moves with the maximum number of captured pieces are valid.
- **King promotion**: Man reaching the far row becomes King. In 100格, promotion stops multi-jump.
- `isValidMove()` re-validates by recomputing `getAllValidMoves()` and matching on `pieceId`, `to`, and `capturedPieceIds.length`.

## Chess Rules (packages/shared/src/chess/rules.ts)

- **Standard rules**: All piece movements, captures, check/checkmate/stalemate detection.
- **Castling**: Tracked via `hasMoved` on king and rook pieces. Validates empty squares between, king not in/through/into check.
- **En passant**: Tracked via `enPassantTarget` on board state. Valid for one ply only after opponent's double pawn push.
- **Pawn promotion**: Generates 4 moves per promotion square (Q/R/B/N). Web client shows PromotionDialog for human; AI always promotes to queen.
- **Draws**: Stalemate, 50-move rule (`halfMoveClock >= 100`), insufficient material (K vs K, K+B/N vs K, K+B vs K+B same color).
- `isValidChessMove()` validates by matching `pieceId`, `to`, `type`, and `promotionPiece`.
- `getChessGameResult()` returns `{ winner, isDraw, reason }` — normalized in game.service.ts to `winner='draw'` for DB storage.

## Gomoku Rules (packages/shared/src/gomoku/rules.ts)

- **Placement**: Players alternate placing one stone per turn on any empty intersection. Black (DARK) moves first.
- **No captures, no piece types**: All stones are equal; `GomokuMove` has only `{ stoneId, to, color }` — no `from`, no `type` beyond `'place'`.
- **Win condition**: First player to get 5 in a row (horizontal, vertical, or diagonal) wins. 6+ in a row also counts as a win (standard Gomoku, not Renju).
- **Draw**: If all 225 intersections are filled with no winner, the game is a draw (`drawReason: 'board_full'`).
- `isValidGomokuMove()` validates: correct turn (`nextColor`), position in bounds, position empty.
- `applyGomokuMove()` places the stone, assigns canonical `stoneId` = `"gs" + (stones.length + 1)`, flips `nextColor`.
- `getGomokuGameResult()` scans all stones in 4 directions, returns `{ winner, isDraw, winningLine }` or `null`.

## Gomoku AI (apps/server/src/services/ai/gomoku/)

- **Algorithm**: Minimax with alpha-beta pruning. Depth: easy=1, medium=2, hard=3.
- **Evaluation**: Piece values + piece-square tables (PST). Endgame detection switches king PST.
- **Move ordering**: Captures and promotions first for better pruning.

## Gomoku AI (apps/server/src/services/ai/gomoku/)

- **Algorithm**: Minimax with alpha-beta pruning. Depth: easy=1, medium=2, hard=3.
- **Candidate move pruning**: Only considers empty cells within Manhattan distance 2 of existing stones (reduces branching from ~225 to ~20-40). First move always center (7,7).
- **Move ordering**: Quick-score heuristic — immediate win > block opponent win > open four > neighbor density + center proximity.
- **Evaluation**: Pattern-based scoring (FIVE=1M, OPEN_FOUR=100K, BLOCKED_FOUR=10K, OPEN_THREE=5K, etc.). Net score = AI patterns − opponent patterns.

## Go Rules (packages/shared/src/go/rules.ts)

- **Placement**: Players alternate placing one stone per turn. Black (DARK) moves first. Pass is always a valid move.
- **Capture**: A group with zero liberties is removed. Captures are resolved after placement, before suicide check.
- **Suicide rule**: Placing a stone that leaves your own group with zero liberties (without capturing anything) is illegal.
- **Simple Ko**: `koPoint` tracks the single-point recapture. Placing on `koPoint` is illegal for one turn.
- **Game end**: Two consecutive passes end the game and trigger scoring.
- **Chinese rules scoring (area scoring)**: `darkTotal = darkStones + darkTerritory`, `lightTotal = lightStones + lightTerritory + komi`. Territory is computed via flood-fill of empty regions bordered by a single color.
- `isValidGoMove()` validates: `board.nextColor === color`, position empty, not Ko violation, not suicide.
- `applyGoMove()` places stone, captures dead groups, updates `koPoint`, increments `consecutivePasses` (resets on placement), updates `capturedByDark`/`capturedByLight`, flips `nextColor`.

## Go AI (apps/server/src/services/ai/go/)

- **Algorithm**: Minimax with alpha-beta pruning. Depth: easy=1, medium=2, hard=3.
- **Candidate move pruning**: Only considers empty cells within Manhattan distance 2 of existing stones (max 20 candidates). First move always center.
- **Move ordering**: Quick-score heuristic — captures > center proximity + liberty safety.
- **Evaluation**: Territory flood-fill + captured stone counts. Net score = AI territory/captures − opponent territory/captures.

## First-Move Rule — Critical for Go and Gomoku

**Go and Gomoku both enforce `board.nextColor === color` in `isValidMove()`.** Black (DARK) always moves first. If the human chooses white (LIGHT), the AI must move first. The `humanGoesFirst` flag must be `humanColor === 'dark'` for these games — otherwise `board.nextColor (DARK) !== humanColor (LIGHT)` causes all moves to be rejected as "Invalid move". Chess and Draughts do NOT have this issue because their `isValidMove` does not check `nextColor` (turn is enforced by `currentPlayer` in the DB).

## Web UI Design System

### Style: 浅色·童趣棋盘 (Light Playful Board)
- **Target users**: 小学初中生 — large touch targets (≥44px), playful emojis, simple Chinese
- **Background**: `bg-warm-50` (#fffbf5) warm off-white, white cards with warm borders
- **Typography**: `--font-display: 'ZCOOL KuaiLe'` (playful rounded display), `--font-body: 'Nunito'` (friendly rounded body)
- **Color palette**: warm-amber primary, each game has its own gradient badge (amber/orange/red/blue/green/violet), mint for wins, coral for errors
- **Interactive**: `rounded-2xl` cards/btns, `border-2`, `active:scale-[0.98]` press feedback, `animate-bounce-in` entrance, `animate-float` hero icon, `animate-rainbow-border` selected game card, `animate-pulse-warm` start button
- **Mobile-first**: Home page `grid-cols-3` game cards, Game page `flex-col` stacking on narrow screens with `lg:flex-row` side-by-side on wide screens, toast `left-4 right-4` full-width on mobile

### Tailwind v4 Theme Tokens (defined in `index.css` `@theme`)
- `--color-warm-*`: 50-900 warm amber scale (primary brand)
- `--color-sky-*`: 50-600 blue scale (info/pass button)
- `--color-coral-*`: 50-600 red scale (danger/errors)
- `--color-mint-*`: 50-600 green scale (success/wins)
- `--color-slate-750`: custom mid-dark

### Home page layout
- Hero: floating 🎲 + title "棋趣乐园" (ZCOOL KuaiLe) + subtitle
- Game grid: 3×2 cards, each with gradient icon circle + name + desc, selected card gets `animate-rainbow-border` + checkmark badge
- Go board size: 3 buttons (19/13/9路) with sky accent
- Difficulty: 3 cards (🌱初学 / 🔥进阶 / 🏆高手) with emoji + label + desc
- Color pick: 2 wide buttons with stone circles (dark/light)
- Start button: full-width gradient `from-warm-400 to-warm-500`, `animate-pulse-warm`, display font

### Game page layout
- `max-w-5xl` centered, `flex-col lg:flex-row`
- Board first (full-width on mobile), aside `w-full lg:w-60` below on mobile, right on desktop
- GameStatus: white card with warm border, emoji indicators (🧑/🤖), mint win / coral loss
- GameControls: rounded-2xl buttons with emoji prefixes, gradient "新游戏"
- MoveHistory: warm-border card, 🧑你 (warm-600) vs 🤖AI (sky-600)

## Web UI Key Patterns

- **Home page**: Game type selector → conditional options (board size for draughts and go, color labels differ by game). Six game types: draughts, xiangqi, chess, gomoku, go.
- **Game page**: Detects `gameType` from loaded game data, delegates to per-game hook + renders corresponding Board component.
- **Per-game hooks** (in `apps/web/src/hooks/`):
  - `useDraughtsGame.ts` — selection state machine + draughts animation + click handler
  - `useChessGame.ts` — selection + promotion dialog + check detection
  - `useGomokuGame.ts` — stone placement + winning line calculation
  - `useGoGame.ts` — stone placement + pass handling + score display
- **Draughts animation** (draughts-only):
  - `apps/web/src/types/draughtsAnimation.ts` — `DraughtsAnimationState`, `DraughtsAnimationFrame`, `buildDraughtsMoveFrames()`
  - `apps/web/src/hooks/useDraughtsAnimationSequencer.ts` — `useDraughtsAnimationSequencer()`
- **Board flip logic**: Human's pieces must always appear at the bottom of the screen. Each board component flips based on `humanColor`:
  - **ChessBoard**: `flipBoard = humanColor === DARK` (white at row 0-1, default bottom; black needs flip)
  - **Board (Draughts)**: `flipBoard = humanColor === LIGHT` (dark at row 0-3, default bottom; light needs flip)
  - **GomokuBoard**: `flip = humanColor === LIGHT` (symmetric board, same rule as draughts)
  - **GoBoard**: `flip = humanColor === LIGHT` (symmetric board, same rule as draughts)
- **ChessBoard**: SVG-based, 72px cells, classic Lichess palette (#f0d9b5/#b58863), **solid Unicode chess symbols** (♚♛♜♝♞♟ for both sides), fill color distinguishes white (#fff + #666 stroke) vs black (#1a1a1a + #999 stroke). Rank/file labels, check highlight (red), last-move highlight (yellow). Selected cell: amber overlay `rgba(216,138,80,0.35)`. Valid targets: small hollow circle (empty) or capture ring (occupied).
- **Board (Draughts)**: SVG-based, pieces rendered as `<PieceElement>` with CSS transition animations. **Piece style: classic top-down wooden disc** — no side-view, no 3D extrusion. Black pieces: deep walnut radial gradient (`#2c2520`→`#12100d`), ivory stroke `#3d3530`. White pieces: ivory white radial gradient (`#f5f0e8`→`#d4c4a8`), stroke `#b8a888`. Inner ring: subtle bevel (`rgba` at 0.06/0.12). King: ♛ symbol, text color `#7a6e62` (black) / `#5c4a2a` (white); stacked discs showing bottom edge. Piece `<g>` elements MUST have `pointerEvents: 'none'` so clicks pass through to underlying cell `<rect>` handlers. **Selection**: cell fill highlight (dark cell `#92400e`, light cell `#fde68a`) instead of border; selected piece shadow offset increases (2,4, 0.3 opacity). **Movable pieces**: `movablePieceIds` from hook — cells with movable pieces get `draughts-movable-cell` class (hover: `brightness(1.25)`). **Valid targets**: warm amber hollow circles (empty: small ring `#d97706`; capture: piece-sized ring + corner dot `#d97706`). No toast on immovable pieces.
- **XiangqiBoard**: SVG-based, wooden board (#F0D9A0), palace diagonals, 楚河漢界. **Cross-mark indicators** at cannon positions (2,1)(2,7)(7,1)(7,7) and pawn positions (3,0)(3,2)(3,4)(3,6)(3,8)(6,0)(6,2)(6,4)(6,6)(6,8) — edge positions only draw inner half. **Piece style: classic wooden drum disc** — `linearGradient` top-down (`#f0dbb8`→`#c0a070`) simulating flat drum top, no spherical highlight. Red pieces: text `#b91c1c`, inner ring `#b91c1c`. Black pieces: text `#1c1917`, inner ring `#1c1917`. Selected: amber stroke `#d97706` strokeWidth 2.5.
- **GomokuBoard**: SVG-based Go-style 15×15 board, 40px cell spacing, wood color (#DCB468), star points at (3,3)/(3,11)/(11,3)/(11,11)/(7,7). **Stone colors unified**: black `#2c2520`→`#12100d`, ivory white `#f5f0e8`→`#d4c4a8`. Spherical radial gradient highlight (black 0.08, white 0.45). Single-click placement. Last move dot indicator, winning line red overlay. No toast on occupied cells.
- **GoBoard**: SVG-based, dynamic cellSize (19路=32px, others=40px), wood color (#DCB468), star points per board size. Go coordinate labels (A-T skipping I). **Stone colors unified** with Gomoku. Single-click placement. Last move indicator dot. Pass button in GameControls. No toast on occupied cells.
- **Promotion flow**: `awaitingPromotion` state in selection state machine → shows `<PromotionDialog>` → user picks piece → `makeMove` called with `promotionPiece` set.
- **AIEngine interface**: `getBestMove(board: B, aiColor: PieceColor): M | null` — all three AIs implement `AIEngine<B, M>`.

### makeMove Mutation — Critical Pattern

**All `makeMoveMutation.mutate()` calls MUST include an `onSuccess` callback** that:
1. Calls `queryClient.setQueryData(['game', gameId], data.game)` **before** `invalidateQueries` — this immediately updates the React Query cache with the server's latest game state, preventing a one-render gap where the board flashes back to pre-move positions (stale cache → new fetch).
2. Updates `lastMove` from the AI's response (if `data.aiMove` exists)
3. Calls `queryClient.invalidateQueries({ queryKey: ['game', gameId] })` to trigger an async refetch for freshness

Without `setQueryData`, there's a flash between `invalidateQueries` (schedules async fetch) and the fetch resolving (cache updates). This applies to all games: draughts, chess, xiangqi, gomoku, go, ludo.

### LocalBoard — All Games' Client-Side Optimistic Board State

**Problem**: React Query's `invalidateQueries` schedules an async refetch. Between the invalidation and the fetch resolving, the cache is stale. If a component renders during this gap, it shows the pre-move board — causing a visible flash/flicker.

**Solution** (applies to ALL six games — Draughts, Chess, Xiangqi, Gomoku, Go, Ludo):
- Each game hook maintains `localBoard` state, updated optimistically using the corresponding `applyMove` from `@board-games/shared/*`
- On human move: immediately `setLocalBoard(applyMove(currentBoard, move))` before the mutation fires
- On AI move received in `onSuccess`: immediately `setLocalBoard(applyMove(applyMove(boardBeforeHumanMove, humanMove), aiMove))` — double-apply to get from pre-human to post-AI state
- `useEffect` syncs `localBoard` from React Query `board` when not animating (authoritative source on refetch)
- `Game.tsx` passes `xxx.localBoard ?? board` to each board component (fallback for initial load)
- On `onError`: revert `setLocalBoard(boardBeforeMove)` and reset selection/lastMove state

**Draughts-specific animation detail** (`useDraughtsAnimationSequencer.ts`):
- The sequencer does NOT call `setAnimState(null)` on completion — instead exposes `clearAnim()` for the caller
- The caller calls `clearAnim()` in `onComplete` after `localBoard` is already set, so React batches both updates into one render — no gap
- `Board.tsx` uses: `displayBoard = animState?.boardSnapshot ?? board`

### Draughts Promotion Animation — SVG Transform Constraint

**Problem**: CSS `@keyframes` using `transform: scale(...)` will override the inline `style.transform` that positions the piece via `translate(...)`. This causes the piece to jump to SVG origin (0,0) — looks like it disappears and flies in from the top-left corner.

**Solution** (`Board.tsx` `PieceElement`):
- CSS `@keyframes piece-promote` only controls `filter` (glow effect), never `transform`
- Scale animation is driven by JS `requestAnimationFrame`, tracking `promotePhase` state (numeric scale value)
- The scale is appended to the inline `transform` string: `translate(...) scale(promotePhase)`, so both position and scale coexist without conflict
- Never use CSS `animation` or `transition` on `transform` for SVG elements that are also positioned via inline `transform`

## Database Schema

- `games` table: id, game_type, status, current_player, board_state (JSON), human_color, ai_difficulty, winner (nullable, 'draw' for draws), draw_reason (nullable), move_count, timestamps
- `moves` table: id, game_id (FK), move_number, player, from_pos, to_pos, move_type, captured_pieces (JSON array string), capture_path, promoted, promotion_to (nullable), board_state_after (JSON), timestamps

## Deployment

- **Domain**: `play.plota.cc` (Cloudflare-proxied A record → 35.77.211.168)
- **Server**: EC2 (same as plota), systemd service `board-games` on port 3001
- **CI/CD**: GitHub Actions `.github/workflows/deploy.yml` — push to master triggers build → scp → ssh deploy
- **Server build**: tsup bundles server as single `dist/index.js` (drizzle-orm inlined, better-sqlite3 external)
- **EC2 first-time setup**: `bash scripts/setup-ec2.sh` (creates systemd service + nginx config)
- **Runtime env**: `PORT=3001`, `DB_PATH`, `WEB_DIST`, `MIGRATIONS_FOLDER` (set in systemd unit)
- **Migration**: Auto-runs on server start via `sqlite.exec()` — detects existing DB to skip already-applied migrations
- **Dev proxy**: Vite proxies `/rpc` → `localhost:3001` (no CORS needed)

## Known Issues

- `favicon.ico` 404 (cosmetic only).
- Route handler for `makeMove` has no try/catch — when `isValidMove` throws, Hono returns a bare 500 with no error body. Should return 400 with message.
