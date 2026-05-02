# UX 交互问题审查报告

## P0 — 严重 Bug

| # | 问题 | 位置 | 说明 |
|---|------|------|------|
| 1 | `resignGame` 无任何校验 | `game.service.ts:269-275` | 不检查游戏是否存在、是否已结束。可对已完成游戏认输覆盖真实结果；对不存在 gameId 直接 UPDATE（静默无影响但无错误） |
| 2 | `undoMove` 可复活已结束游戏 | `game.service.ts:240-266` | 无 `status === 'in_progress'` 检查。游戏结束后悔棋会强制将 `status` 改回 `'in_progress'`、清除 `winner` |

## P1 — 交互体验缺陷

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 3 | 无任何用户可见的错误提示 | `Home.tsx:28` console.error; 各 hooks mutations 无 `onError` | 创建游戏失败/走法失败时用户只看到按钮恢复，无任何反馈 |
| 4 | Header 用 `<a href>` 导致整页刷新 | `Header.tsx:6,12` | 每次点"首页"/Logo 触发整页重载，失去 SPA 体验 |
| 5 | AI 同步阻塞请求 | `game.service.ts` — 所有 `strategy.getAiMove()` 是同步调用 | 困难难度下 HTTP 挂起数秒，Node event loop 被阻塞，所有用户请求排队 |
| 6 | 跳棋选不可走棋子无反馈 | `useDraughtsGame.ts:68-72` — 强制吃子时选择非吃子棋子返回空数组 | 用户不知道为什么没有合法走法，缺少"你必须吃子"提示 |
| 7 | 走法失败后本地状态不同步 | 所有 hooks — mutation 失败时 `lastMove`/`selection` 已修改但不会回滚 | 用户点击走法后即使失败棋盘也显示走了；需刷新恢复 |
| 8 | MoveHistory 冗余轮询 | `MoveHistory.tsx:8` — `refetchInterval: 3000` | 游戏数据已通过 `invalidateQueries` 手动刷新，3 秒轮询完全是冗余网络开销 |
| 9 | 跳棋 `isValidMove` 匹配粒度不足 | `draughts/rules.ts` — 只匹配 `capturedPieceIds.length` | 不同吃子路径到同一终点且吃子数相同时都视为合法，`applyMove` 按传入的 IDs 删除，可能吃错子 |

## P2 — UI/视觉问题

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 10 | HTML 标题硬编码"国际跳棋" | `index.html:7` | 不管玩什么游戏，标签页始终显示"国际跳棋" |
| 11 | 无 404 页面/路由兜底 | `main.tsx:18-24` | 访问无效 URL 渲染空白 `<Outlet />`，用户不知所措 |
| 12 | 无 Error Boundary | 整个应用 | 任何组件运行时错误导致白屏崩溃 |
| 13 | 所有棋盘固定像素尺寸，无响应式 | Board(56px), ChessBoard(72px), GomokuBoard(40px), GoBoard(动态32/40px) | 移动端溢出，棋盘不可缩放 |
| 14 | 升变对话框无法取消 | `PromotionDialog.tsx` — 无关闭/取消按钮 | 触发升变后必须选择，无法反悔 |
| 15 | 五子棋 winningLine 截断为5 | `gomoku/rules.ts:~120` — `.slice(0, 5)` | 6+连珠只高亮5个棋子，视觉不完整 |
| 16 | 跳棋浅色格无视觉区分 | `Board.tsx:134` — cursor 仅深色格为 pointer | 用户可能尝试点击浅色格，无反馈 |
| 17 | Go/五子棋 `getValidMovesForPiece` 返回空数组 | `gomoku.strategy.ts:29`, `go.strategy.ts:35` | 用户点棋子时 API 返回空数组但无提示 |

## P3 — 竞态/健壮性

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 18 | `makeMove` 无并发控制 | `game.service.ts:126-128` — read-then-write 无锁 | 双击或网络重试可能导致同一棋步执行两次 |
| 19 | 跳棋动画完成后双重 invalidate | `useDraughtsGame.ts:48-60` — AI 动画回调 + mutation onSuccess 都会 invalidate | 棋盘可能闪烁（两次重渲染） |
| 20 | Go AI `moveQuickScore` 未清除临时放置的棋子 | `go/minimax.ts:moveQuickScore` | 在 `grid[row][col] = move.color` 后未恢复 `grid[row][col] = null`，后续计算使用脏 grid |
| 21 | Go AI `getCandidateMoves` 中 `moveQuickScore` 参数可能不匹配 | `go/minimax.ts:~55` | 函数签名与调用参数可能不一致 |

## P4 — 代码质量/设计

| # | 问题 | 位置 | 影响 |
|---|------|------|------|
| 22 | `GameType.CHINESE_CHESS` 是幽灵值 | `types/game.ts` — enum 中存在但无实现、不可创建 | 误导开发者 |
| 23 | oRPC 客户端 `move: any` / `getValidMoves` 返回 `any[]` | `orpc-client.ts:14,15` | 边界处丢失类型安全 |
| 24 | 五子棋/围棋客户端生成临时 stoneId | `useGomokuGame.ts:31`, `useGoGame.ts:27` | 服务端会重新分配 ID，客户端 ID 是占位符；服务端校验依赖 ID 可能出错 |

## 建议修复优先级

1. **#1 + #2** — 服务端校验（防数据损坏，改动小）
2. **#20** — Go AI moveQuickScore 脏 grid bug
3. **#3 + #7** — 错误提示 + 走法失败回滚
4. **#4** — Header 改 `<Link>`
5. **#10 + #11 + #12** — 标题/404/ErrorBoundary
6. **#6** — 跳棋强制吃子提示
7. **#13** — 响应式
8. **#18** — 并发控制
9. **其余**
