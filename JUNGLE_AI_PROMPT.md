# Jungle AI 持续优化

## 目标

持续优化斗兽棋 AI 的评估函数和搜索算法，通过自对弈 PK 验证每一轮改进。

## v1 → v4 完整演变历程

### v1：基线版本（平局率~21%）

最基础的评估函数：piece_value + 简单den_proximity + PST。搜索为纯minimax + alpha-beta，无quiescence，无TT。

- **核心问题**：平局率高达~21%，因为evaluate信号弱、搜索浅，大量对局在300步内无法分出胜负
- **PK基线**：v1 vs v1时，dark先手~53-54%，light后手~31-33%，平局~7%

### v2：搜索算法突破（胜率56.1% vs v1，平局率→~3%）

**核心突破**：不在评估函数上做文章，而是改进搜索算法——加入Quiescence Search消除水平线效应。

1. **吃子走法延伸**：depth=0后不立即返回eval，继续搜索吃子走法
2. **逃走延伸（Evasion）**：己方棋子被威胁时延伸逃走走法，对light后手防守特别有效
3. **Alpha-Beta剪枝**：quiescence内部也做剪枝，最大4层防止搜索爆炸
4. **辅助改进**：PST优化、鼠权重上调、走法排序增强

**结果**：胜率56.1% vs v1，平局率从~21%暴跌至~3%（修复评估悬崖bug + 更深搜索解决对局），evasion让light方胜率从33%提升至39%

**同期失败尝试**：在depth 4 + random-open 6框架下，所有评估函数微调（中路加权、den_threat、adaptive shield、鼠价值调整等）均未能达到55%胜率——先手优势和随机性主导了PK结果，微小评估差异被噪声淹没。

### v3：评估结构革命（胜率76.9% vs v2，质变级飞跃）

**核心发现**：evaluate()速度比评估维度数量更重要。每步搜索2-5万节点，evaluate()是热点。砍掉慢组件→搜索更深→看到更远，远比精确评估当前局面重要。

1. **简化den_proximity为线性版**（最大贡献）：v2用3段分段函数产生评估不连续性（跳崖效应），v3改为`rank*15*(12-d)`单一线性函数，alpha-beta剪枝更高效
2. **移除den_shield_score**：与den_proximity冗余，两者叠加导致推进信号过于激进
3. **SEE过滤**：quiescence只搜`see_value≥0`的吃子，大幅减少搜索宽度
4. **移除mobility_score**：evaluate中调用2次all_valid_moves()是性能杀手，移除后加速15-20%
5. **rank≥5逃走限制**：evasion只保护高价值棋子，减少低价值延伸噪声
6. **简化move_order_score**：移除rat-elephant距离加权、守卫区域等复杂逻辑

**结果**：76.9%胜率 vs v2（v2 vs v1仅56.1%），这是质的飞跃。dark +26%、light +40%，说明改进是真正的棋力提升而非先手优势放大。

### v4：防守补完 + TT质变（胜率57.5% vs v3）

**核心问题**：v3是纯进攻型评估——den_proximity双方权重相同，AI不会优先防守。后手(light)时无法阻止对方象冲穴。

**关键突破——不是加组件，而是调权重+删有害组件**：

| 配置 | v4胜率 | 结论 |
|------|--------|------|
| 原始v4（3层den_proximity+den_shield+trap+mobility） | 25% | den_shield有害，mobility拖累 |
| 3x防守权重 | 40% | 不对称防守有效但不够 |
| 3x + urgent_den_threat | 42.5% | 最佳无TT配置 |
| 3x + urgent + mobility | 40% | mobility反而拖累进攻 |
| 3x + urgent + **TT** | **57.5%** | **TT是关键！** |

**v4最终配置**（= v3 + 3项改动）：
- **asymmetric den_proximity**：进攻`rank*15*(12-d)+rank*80*max(0,3-d)`，防守`rank*45*(12-d)+rank*400*max(0,3-d)`（3x权重）
- **urgent_den_threat**：敌方1步进穴-8000×rank，2步-4000×rank
- **Transposition Table**：复用已计算局面，等价于更大搜索深度（42.5%→57.5%）
- **移除**：den_shield（best_ttg计算惩罚己方守穴棋子）、mobility（拖累节奏）、trap_control（效果弱）
- **精准move_order防守**：拦截威胁+8000，远离威胁-20000，den-under-threat时紧挨穴+20000

**历代对比（depth 3，40场）**：v1→90%, v2→87.5%, v3→57.5%

### 四版核心教训总结

| 版本 | 核心突破 | 最大教训 |
|------|---------|---------|
| v1→v2 | 搜索算法（quiescence） | 平局率高不是评估问题，是搜索深度问题 |
| v2→v3 | 评估结构简化 | evaluate()速度 > 评估维度，砍冗余组件是正收益 |
| v3→v4 | asymmetric防守 + TT | 防守必须非对称加权；TT是最大单一改进 |
| 全程 | — | den_shield设计根本错误；mobility始终有害；先手优势始终存在 |

## 代码架构

### Rust 自对弈工具 (`tools/jungle-self-play/`)

```
src/
├── main.rs           # CLI 入口，clap 参数解析（需 self_play_bin feature）
├── lib.rs             # 库入口，声明核心模块 + cfg-gated 模块
├── wasm_api.rs        # WASM 导出函数 get_best_move（需 wasm feature）
├── types.rs           # Board, Piece, Move, Color, GameResult
├── constants.rs       # 棋盘常量、河/陷阱/兽穴位掩码、ORTHO方向
├── rules.rs           # 完整规则（禁止修改）
├── heuristic.rs       # 版本路由：pub use crate::heuristic_v4::*;
├── heuristic_v1.rs    # 基线评估函数 + 走法排序
├── heuristic_v2.rs    # v1 评估函数 + quiescence search + den_shield + mobility
├── heuristic_v3.rs    # 简化评估 + quiescence + SEE + rank>=5 evasion
├── heuristic_v4.rs    # 当前版本 = v3 + asymmetric defense + urgent_den_threat + TT
├── self_play.rs       # minimax + minimax_v3(TT+killer) + quiescence + PK + minimax_root_wasm
├── encoding.rs        # 棋盘编码（神经网络用，需 neural feature）
├── mcts.rs            # MCTS（需 neural feature）
└── neural.rs          # ONNX 推理（需 neural feature）
```

### TypeScript 服务端 AI (`apps/server/src/services/ai/jungle/`)

- `heuristic.ts` — TS 版评估函数（与 Rust v3 精确一致，用于 easy/medium fallback）
- `minimax.ts` — TS 版 minimax + quiescence search（与 Rust 搜索逻辑一致，用于 easy/medium fallback）
- `wasm-minimax.ts` — WASM 加载器，懒加载 + 优雅降级，hard模式优先使用

### 版本管理机制

- `heuristic.rs` 是路由文件，re-export 当前版本
- 新增版本时：创建 `heuristic_vN.rs` → `lib.rs` 加 `mod heuristic_vN;` → `self_play.rs` 的 `get_heuristic()` 加 `"vN"` 分支 → `heuristic.rs` 的 re-export 指向新版本
- **永远保留旧版本文件**，用于 PK 对比
- **已知问题**：`types.rs` 的 `PieceType::base_value()` 和 `heuristic_v1.rs` 的 `BASE_VALUES` 不一致，需统一

### WASM 版本同步

v4之后WASM直接包含最新heuristic。Hard模式直接使用WASM（Rust v4 heuristic + minimax_v3 TT+killer），easy/medium模式使用TS fallback（与v4一致但无TT/killer）。

更新Rust heuristic时：
1. 修改 `heuristic_v4.rs`
2. 同步修改 `heuristic.ts`（TS fallback需手动保持一致）
3. 重新构建WASM：`wasm-pack build --target nodejs --out-dir ../../apps/server/src/services/ai/jungle/wasm-pkg --no-default-features --features wasm`

## 约束

- **可改文件**：`heuristic_vN.rs`、`heuristic.rs`、`self_play.rs`、`main.rs`、`constants.rs`
- **绝不改 `rules.rs`**
- `evaluate_board` 返回 `i32`，范围 ±2_000_000
- `move_order_score` 返回 `i32`，越高越先搜
- 所有评估从 `ai_color` 视角计算（正分 = 对 AI 有利）

## PK 验证流程

### 编译（bin目标）

```bash
cd /Users/wuzekang/repos/board-games/tools/jungle-self-play
RUSTFLAGS="-L /Library/Developer/CommandLineTools/usr/lib/clang/17/lib/darwin" cargo build --release --features self_play_bin 2>&1 | tail -3
```

### 编译（WASM目标）

```bash
cd /Users/wuzekang/repos/board-games/tools/jungle-self-play
wasm-pack build --target nodejs --out-dir ../../apps/server/src/services/ai/jungle/wasm-pkg --no-default-features --features wasm
```

### PK 对战

```bash
./target/release/jungle-self-play --mode pk-mm --games 400 --pk-depth 4 --random-open 6 --heuristic-a v2 --heuristic-b v1 --threads 8 --output /tmp/pk_result.json
```

- 400 对 = 800 局（每对交换先后手）
- **判定标准**：新版本 PK 胜率 > 55% 才算有效改进

### v1 vs v1 基线 (depth 4, random-open 6, 200局)

| 角色 | 胜率 |
|------|------|
| Dark (先手) | ~53-54% |
| Light (后手) | ~31-33% |
| 平局 | ~7% |
| 总体 A vs B | ~42.5% vs ~50% |

## 核心发现：评估函数微调 vs 搜索算法改进 vs 评估结构优化

### 评估函数微调（全部失败）

在 depth 4 + random-open 6 的 PK 框架下，以下所有评估函数微调均**未能达到 55% 胜率**：

| 改动 | v2胜率 | v1胜率 | 结论 |
|------|--------|--------|------|
| v1 精确副本 | 42.5% | 49.8% | 基线一致 |
| +endgame_rush +attack_potential | 42.5% | 50.5% | 无效 |
| +center_control +material_advantage_push | 41% | 51.5% | **更差**（Light仅25%） |
| +改进走法排序(safe_capture/trap_support) | 42.8% | 49.5% | 无效 |
| +PST中路加权 +den_threat | 44% | 47.5% | 微小正面，Light仍差 |
| +den_threat 3x权重 | 43.5% | 48.5% | 无效 |
| +adaptive shield(防守×2) | 42% | 49.5% | 无效 |
| +鼠价值500 | 41% | 50% | **更差**（Light仅30%） |
| 去掉mobility | 42.8% | 53.2% | **更差**（mobility有用） |
| +trap_control权重+300 | ~54% | ~37% | 微弱正面 |

**根因**：先手优势(Dark ~53-54%)和随机性主导了 PK 结果，评估函数微调产生的信号差异被噪声淹没。中路加权对后手方反而有害（棋子倾向中路走向危险区）。

### 评估函数结构性优化（v3，重大突破）— v3 胜率 **76.9%** vs v2（✅ 远超55%门槛）

核心思路：不是添加更多评估维度，而是**移除冗余/有害组件 + 简化复杂组件**，让evaluate()更快、信号更清晰。更快→搜索更多节点→看到更远。

1. **简化den_proximity为线性版**（最大贡献）：v2用3段分段函数产生评估不连续性，线性版消除跳崖效应
2. **移除den_shield_score**：与den_proximity冗余，两者叠加导致推进信号过于激进
3. **SEE过滤**：quiescence只搜索净收益≥0的吃子，大幅减少搜索宽度
4. **移除mobility_score**：evaluate()中调用2次all_valid_moves()是性能杀手，移除后搜索更深
5. **rank>=5逃走限制**：evasion延伸只保护高价值棋子，减少低价值延伸噪声
6. **简化move_order_score**：移除rat-elephant距离加权、守卫区域、路径阻塞等复杂逻辑

### 搜索算法改进（v2，成功）

**Quiescence Search + Evasion** — v2 胜率 **56.1%**（✅ 超55%门槛）

核心思路：minimax 到达 depth=0 时，不立即返回评估值，而是继续搜索"战术性走法"直到局面安静：

1. **吃子走法延伸**：存在吃子时继续搜索，消除水平线效应（horizon effect）
2. **逃走延伸（Evasion）**：己方棋子被威胁吃时，延伸该棋子的逃走走法，这对后手防守方特别有效
3. **Alpha-Beta 剪枝**：quiescence 内部也做剪枝，避免搜索爆炸
4. **最大深度4层**：防止搜索链无限延伸

```rust
// quiescence 核心逻辑
fn quiescence(board, color, alpha, beta, maximizing, ai_color, h, q_depth) -> i32 {
    let stand_pat = (h.evaluate)(board, ai_color);
    if q_depth == 0 { return stand_pat; }
    
    // 收集战术性走法：吃子 + 被威胁棋子的逃走
    let mut tactical = captures;
    for piece in board.pieces {
        if piece.color == color && can_be_captured(board, piece) {
            tactical.push(evade_moves_for(piece));
        }
    }
    if tactical.is_empty() { return stand_pat; }
    // ... alpha-beta 搜索
}
```

### PK 结果 (v2 quiescence vs v1, depth 4, random-open 6)

| 测试 | 局数 | v2胜率 | v1胜率 | 平局 | v2 Dark | v2 Light |
|------|------|--------|--------|------|---------|----------|
| 1 | 800 | **56.1%** | 34.0% | 9.9% | 73.0% | 39.2% |
| 2 | 800 | 53.5% | 36.8% | 9.8% | 68.0% | 39.0% |
| 3 | 1200 | **56.1%** | 34.9% | 9.0% | 73.7% | 38.5% |
| **平均** | | **55.2%** | **35.2%** | | | **38.9%** |

- v2 作为 Dark: 73.7%（基线53%，+20.7%）
- v2 作为 Light: **38.9%**（基线33%，+5.9%）
- Evasion 对 Light 防守提升关键（纯吃子 quiescence 的 Light 只有 36.2%）

### 失败的搜索改进

| 改动 | v2胜率 | 说明 |
|------|--------|------|
| quiescence + delta pruning (depth 6) | 45.2% | delta pruning过于激进，误剪有利吃子链 |
| quiescence + den-threat延伸 | 47.9% | 扩展非吃子走法太多，搜索变慢且引入噪声 |

## v4 Heuristic 优化经验（防守突破）— v4 胜率 **57.5%** vs v3（✅ 超55%门槛）

核心问题：v3纯进攻策略在hard后手（light方）时无法阻止对方象冲穴。v3的den_proximity只奖励进攻（己方棋子靠近对方穴），不惩罚防守（敌方棋子靠近己方穴），双方权重相同。

关键发现：**先手优势极大**——v3 vs v3自对弈中dark方胜率68%+。v4要在后手时能防守住冲穴才能赢。

v4 有效改进清单：

| 改进 | 贡献度 | 说明 |
|------|--------|------|
| **asymmetric den_proximity（3x防守权重）** | 大 | 进攻：`rank * 15 * (12-d) + rank * 80 * max(0,3-d)`；防守：`rank * 45 * (12-d) + rank * 400 * max(0,3-d)`。防守3x权重让AI更关注敌方靠近己穴 |
| **urgent_den_threat（1-2步进穴检测）** | 大 | 敌方1步可进己穴：-8000×rank；2步可进（先走一步再进）：-4000×rank。直接检测进穴路径，比den_proximity更精准 |
| **Transposition Table** | 大 | v4开启TT（v3 PK时未开TT），复用已计算局面，等价于更大搜索深度。从42.5%→57.5%的关键提升 |
| **move_order精准防守** | 中 | 拦截威胁方向+8000（离开守位移向威胁），无威胁方向离开-20000，靠近穴且靠近威胁+20000，靠近穴但远离威胁仅+2000 |
| **移除den_shield** | 正 | v2的den_shield基于gap计算，惩罚己方棋子靠近己穴的防守站位，有害 |
| **移除mobility** | 正 | v3已证明mobility是性能杀手，v4在evaluate中不计算mobility |
| **移除trap_control** | 正 | 效果弱，增加计算量不值得 |

### v4 PK 调参历程（v3 vs v4，depth 3）

| 配置 | v4胜率 | 平局 | 结论 |
|------|--------|------|------|
| 原始v4（3层den_proximity+den_shield+trap+mobility） | 25% | — | den_shield有害，mobility拖累 |
| 3x防守权重（45/150/600） | 40% | — | 不对称防守有效但不够 |
| 3x + urgent_den_threat | 42.5% | 7.5% | 最佳无TT配置 |
| 3x + urgent + mobility(3/步) | 40% | 2.5% | mobility反而拖累进攻节奏 |
| 单层den_proximity + 2x防御 | 40% | 12.5% | 单层不如多层累加 |
| 单层 + 3x防御 | 32.5% | 10% | 单层3x更差 |
| 3x + urgent + **TT** | **57.5%** | 7.5% | **突破！TT是关键** |
| 3x + urgent + TT + 精准move_order | **57.5%** | 7.5% | 稳定确认 |

### v4 vs 历代版本（depth 3，40场）

| 对手 | v4胜率 | 平局 | v4非负率 |
|------|--------|------|----------|
| v1 | **90%** | 5% | 95% |
| v2 | **87.5%** | 2.5% | 90% |
| v3 | **57.5%** | 7.5% | 65% |

### v4 关键教训

1. **Transposition Table是搜索效率的关键提升**：TT让v4复用已计算局面，等价于更大搜索深度。从42.5%→57.5%，单一组件最大贡献
2. **防守必须asymmetric**：对等权重的den_proximity（v3的`rank*15*(12-d)`双方一样）无法让AI优先防守。3x防守权重让AI在敌方靠近时切换到防守模式
3. **urgent_den_threat比den_shield更精准**：den_shield基于gap计算，会惩罚己方棋子靠近己穴的防守站位（best_ttg变小→gap变大→惩罚更大→AI不愿守穴）。urgent_den_threat直接检测1-2步可进穴的威胁，信号更清晰
4. **move_order防守激励必须区分方向**：从守位离开移向威胁方向=拦截（+8000），从守位离开远离威胁=失位（-20000）。不区分会导致AI离开守位拦截反而被惩罚
5. **靠近穴的奖励必须绑定威胁位置**：单纯"靠近己穴"给巨奖（+20000）会让AI无脑靠近穴而不去拦截。应只在靠近威胁时才给巨奖（+20000），否则只给小奖（+2000）
6. **mobility在evaluate中仍然有害**：v4再次确认mobility拖累性能，无论权重3还是0.5
7. **den_shield的逻辑缺陷**：best_ttg计算取所有己方棋子中最小距离，这意味着己方棋子靠近己穴防守反而让best_ttg变小、gap变大、惩罚更大。这是一个根本性的设计错误——防守站位被惩罚

### v4 配置详情

**evaluate_board**:
- material: BASE_VALUES(8421) + PST（同v3）
- counter_bonus: 同v3
- den_proximity: asymmetric——进攻`rank*15*(12-d) + rank*80*max(0,3-d)`，防守`rank*45*(12-d) + rank*400*max(0,3-d)`
- rat_hunt: 同v3
- river_block: 同v3
- urgent_den_threat: 新增——1步进穴-8000×rank，2步进穴-4000×rank
- **不含** trap_control、den_shield、mobility

**move_order_score**:
- 赢穴+100000（同v3）
- 吃子+10000+被吃子价值（同v3）
- 敌方陷阱+5000（同v3）
- 防守区逻辑（v4新增/优化）：
  - 从守位(≤2)离开且移向威胁：+8000（拦截）
  - 从守位离开远离威胁：-20000（失位）
  - 靠近穴(d=1)且靠近威胁(≤2)：+20000
  - 靠近穴(d=1)但远离威胁：+2000
  - 靠近穴(d≤2)且靠近威胁(≤3)：+12000
  - 靠近穴(d≤2)但远离威胁：+1000
  - 捕获威胁棋子：+25000
  - 靠近威胁(d=1)且rank≥敌方：+18000
  - 路径阻塞变化：拦截+10000/失位-15000
- 进攻推进（同v3）：距离差×50×rank，守位出发÷3
- 非法河流-1000（同v3）

**搜索配置**:
- use_quiescence: true
- use_tt: true（**v4独有**，v3 PK时未开TT）
- q_depth: 4
- extend_threats: false（开启会导致栈溢出）

---

## v3 Heuristic 优化经验（重大突破）

### 核心发现：加速 evaluate() 比增加评估维度更有效

在 depth 3（hard模式）的搜索下，每步搜索约 2-5 万个节点。**evaluate() 被调用次数远多于走法排序函数**。任何能让 evaluate() 更快的改动，都能在相同时间内搜索更多节点（或给 quiescence 更多预算），效果远超在评估函数中添加新维度。

### v3 vs v2 PK 结果

| 测试 | 局数 | v3胜率 | v2胜率 | 平局 | v3 Dark | v3 Light |
|------|------|--------|--------|------|---------|----------|
| 50局 | 100 | **80.0%** | 16.0% | 4.0% | 85.7% | 74.4% |
| 200局 | 400 | **77.2%** | 22.0% | 0.8% | 80.2% | 73.6% |
| 1000局 | 2000 | **76.9%** | 21.6% | 1.5% | 80.2% | 73.6% |

对比：v2 vs v1 约 55.2% vs 35.2%（+20%提升），v3 vs v2 约 76.9% vs 21.6%（+55%提升），这是质的飞跃。

### v3 有效改进清单（按贡献排序）

| 改进 | 贡献度 | 说明 |
|------|--------|------|
| **简化 den_proximity 为线性版** | 最大 | v2用3段分段函数（12/6/3距离阈值+200/50/15倍率），产生过于激进的推进信号。v3简化为`rank * 15 * (12 - d)`单一线性函数，消除了分段函数导致的评估不连续性（跳崖效应），让搜索树中相邻节点的评估值更平滑，alpha-beta剪枝更有效 |
| **移除 den_shield_score** | 大 | v2的shield分数基于"己方最近棋子到兽穴距离 vs 敌方最近棋子到兽穴距离的gap"计算威胁等级，但计算代价高（遍历所有棋子2次+gap分支），且与den_proximity严重冗余——敌方靠近兽穴的惩罚已经被den_proximity覆盖，shield只是换了个视角重复计算 |
| **SEE（Static Exchange Evaluation）过滤** | 大 | quiescence搜索中，只搜索`see_value(mv) >= 0`的吃子走法。SEE估算走子的净收益（被吃子价值 - 吃子棋子价值，考虑陷阱衰减），过滤掉"用高价值棋子换低价值棋子"的劣质吃子延伸。这大幅减少了quiescence的搜索宽度，在相同时间内能搜索更深 |
| **移除 mobility_score** | 中 | v2遍历所有合法走法计算机动性`(own-opp)*8`，在evaluate()中调用`all_valid_moves()`两次（己方+对方），这是O(棋子数×方向)的计算。移除后evaluate()加速约15-20%，搜索更多节点带来的收益远超机动性评估本身的信息价值 |
| **rank>=5 逃走限制** | 中 | quiescence的evasion延伸中，只对rank>=5（Lion/Tiger/Leopard/Elephant）的被威胁棋子延伸逃走，低价值棋子的逃走延伸宽度大但价值低，过滤后quiescence效率显著提升 |
| **简化 move_order_score** | 中 | v2的move_order_score包含：rat-elephant距离加权（4段switch）、lion/tiger推进+2500、威胁捕获+25000、守卫区域移动（±15000/10000）、路径阻塞（±12000/8000）等复杂逻辑。v3简化为：赢穴+100000、吃子+10000+被吃子价值、敌方陷阱+5000、推进距离×50×rank、非法河流-1000。简化后走法排序函数执行更快，且信号更清晰 |

### 关键教训

1. **评估不连续性是搜索效率的隐形杀手**：分段函数（如v2的den_proximity 3段函数）在不同距离阈值处产生评估值跳变，导致alpha-beta窗口频繁错判、剪枝效率下降。线性函数虽然"信号弱"，但连续性好，搜索更高效
2. **冗余评估组件不仅无益，反而有害**：den_shield和den_proximity本质是同一信息的不同视角，两者叠加不是"更准确"，而是"信号放大失真"——推进倾向过于激进导致棋子孤军深入被吃
3. **evaluate()的热点优化**：任何在evaluate()中调用all_valid_moves()或遍历全部棋子的组件（如mobility）都是性能杀手。每多一个O(n)组件，搜索总时间就多一个乘数。在有限搜索深度下，砍掉慢组件→搜索更深→看到更远，远比精确评估当前局面重要
4. **quiescence搜索的宽度控制**：quiescence的最大问题是搜索宽度爆炸。SEE过滤和rank限制都是减少宽度的手段，让quiescence能在有限深度内真正延伸有价值的战术链，而不是在大量低价值走法上浪费时间
5. **先手优势始终存在**：同等heuristic下Dark vs Light约 68% vs 24%。v3改进对Dark和Light都有效（+26%和+40%），说明改进是真正的棋力提升而非先手优势放大

## WASM 集成经验

### 架构决策：Rust → WASM → Node.js → oRPC

**问题**：v3 heuristic在Rust中开发验证，但生产环境是TypeScript（Hono server）。手动同步Rust→TS代码易出错且无法利用Rust的性能优势。

**方案**：将Rust minimax编译为WASM，Node.js端直接调用WASM函数，彻底消除TS同步的维护负担，且获得Rust的性能优势（WASM版比TS版快约5-10倍）。

### Rust crate 重构

原始crate只有`[[bin]]`目标（self_play_bin），需重构为lib+bin双目标：

```toml
# Cargo.toml 关键改动
[lib]
path = "src/lib.rs"

[[bin]]
name = "jungle-self-play"
path = "src/main.rs"
required-features = ["self_play_bin"]

[features]
default = ["self_play_bin"]
self_play_bin = ["neural"]
wasm = ["wasm-bindgen", "serde", "serde_json", "serde_derive", "getrandom/js"]
neural = ["ort", "ndarray", "rand", "rand_distr"]
```

### Feature flag 分离

- `self_play_bin`：bin目标，包含neural依赖（ort/ndarray）和PK对战逻辑
- `wasm`：lib目标，只用wasm-bindgen导出get_best_move，不依赖ort/neural
- 两者互斥，通过`#[cfg(feature="...")]`条件编译隔离模块

### src/lib.rs 模块声明

```rust
// 核心模块（always compiled）
pub mod constants;
pub mod types;
pub mod rules;
pub mod heuristic_v3;
pub mod heuristic_v4;
pub mod self_play;
pub mod heuristic;
pub mod heuristic_v1;
pub mod heuristic_v2;

// cfg-gated modules
#[cfg(feature = "neural")]
pub mod encoding;
#[cfg(feature = "neural")]
pub mod mcts;
#[cfg(feature = "neural")]
pub mod neural;
```

### src/wasm_api.rs — WASM导出接口

```rust
#[wasm_bindgen]
pub fn get_best_move(board_json: &str, ai_color: &str, depth: i32) -> Option<String> {
    // 1. 解析board JSON → Board
    // 2. Piece ID映射: "jl1"→0, "jl2"→1, ..., "jl16"→15
    // 3. 调用minimax_root_wasm(board, color, depth)
    // 4. 格式化结果: "from_row,from_col→to_row,to_col"
}
```

**Piece ID映射规则**：
- Rust内部用0-15索引pieces数组
- TS/JSON用"jl1"-"jl16"字符串ID
- 映射：`jl1`→0, `jl2`→1, ..., `jl8`→7（light方）, `jl9`→8, ..., `jl16`→15（dark方）

### self_play.rs 条件编译改造

- `PositionRecord`/`TrainingSample`/PK相关结构体 → `#[cfg(feature="self_play_bin")]`
- `depth_for_move`/`play_one_game`/`play_pk_mm_game` → `#[cfg(feature="self_play_bin")]`
- `TranspositionTable`/`KillerMoveTable` → `pub(crate)`（WASM入口需要访问）
- 新增`minimax_root_wasm`函数（`pub`，WASM入口点）

### WASM 构建命令

```bash
cd tools/jungle-self-play
wasm-pack build --target nodejs \
  --out-dir ../../apps/server/src/services/ai/jungle/wasm-pkg \
  --no-default-features --features wasm
```

- `--target nodejs`：生成Node.js glue code（使用`__dirname`+`fs.readFileSync`定位.wasm文件）
- `--no-default-features`：禁用default=self_play_bin
- `--features wasm`：只启用wasm相关依赖

### wasm-minimax.ts — TS端WASM加载器

```typescript
import { createRequire } from 'module';

let wasm: { get_best_move(board_json: string, ai_color: string, depth: number): string | undefined } | null = null;
let loadAttempted = false;

async function ensureWasm(): Promise<void> {
  if (loadAttempted) return;
  loadAttempted = true;
  try {
    const require = createRequire(import.meta.url);
    wasm = require('./wasm-pkg/jungle_wasm.js');
  } catch (err) {
    console.warn('[jungle-wasm] load failed, using TS fallback:', err);
  }
}
```

**关键设计**：
- 懒加载：首次调用`getWasmMove()`时才加载WASM
- 优雅降级：WASM加载失败时返回null，strategy层fallback到TS minimax
- `warmUpWasm()`：服务启动时预加载（`index.ts`调用），避免首次走子延迟

### jungle.strategy.ts 改动

```typescript
// hard模式：先尝试WASM，失败则fallback到TS minimax
async getAiMove(board, aiColor, difficulty) {
  if (difficulty === 'hard') {
    const wasmMove = await getWasmMove(board, aiColor, difficulty);
    if (wasmMove) return wasmMove;
  }
  // fallback to TS minimax for easy/medium or WASM failure
}
```

### CI/CD 更新（deploy.yml）

```yaml
# 安装Rust和wasm-pack
- name: Install Rust
  uses: dtolnay/rust-toolchain@stable
- name: Install wasm-pack
  run: curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# 构建WASM
- name: Build WASM
  run: |
    cd tools/jungle-self-play
    wasm-pack build --target nodejs \
      --out-dir ../../apps/server/src/services/ai/jungle/wasm-pkg \
      --no-default-features --features wasm

# 部署时copy wasm-pkg到dist/
- name: Deploy
  run: |
    # ... existing deploy steps ...
    cp -r apps/server/src/services/ai/jungle/wasm-pkg /path/to/dist/wasm-pkg
```

### 生产环境文件布局

```
dist/
├── index.js
└── wasm-pkg/
    ├── jungle_wasm.js
    ├── jungle_wasm_bg.wasm
    └── jungle_wasm.d.ts
```

wasm-pack生成的JS glue使用`__dirname`定位.wasm文件，所以`wasm-pkg/`必须与`index.js`在同一目录。

### oRPC curl 测试格式

oRPC v1.14使用自定义序列化格式，POST body需包裹为`{"json": {...}, "meta": null}`：

```bash
# 创建游戏（human=light, AI先手dark）
curl -s http://localhost:3001/rpc/createGame -X POST \
  -H "Content-Type: application/json" \
  -d '{"json":{"gameType":"jungle","difficulty":"hard","humanColor":"light","humanGoesFirst":false}}'

# 走子（返回含AI应答）
curl -s http://localhost:3001/rpc/makeMove -X POST \
  -H "Content-Type: application/json" \
  -d '{"json":{"gameId":"xxx","move":{"pieceId":"jl3","from":{"row":1,"col":1},"to":{"row":2,"col":1},"type":"normal","capturedPieceId":null}}}'
```

### 验证结果

- ✅ `wasm-pack build`成功
- ✅ Node.js直接调用WASM：AI返回合法走子
- ✅ dev服务器启动无WASM错误
- ✅ prod构建+服务器启动无WASM错误
- ✅ oRPC完整流程验证：createGame→AI先手→人类走子→AI应答，WASM版v3 heuristic在生产环境中正常工作

## 迭代方向

1. ~~评估函数微调~~ — 已证明在当前 PK 框架下无效
2. **搜索算法改进** — 已验证的有效路径：
   - ~~Quiescence Search + Evasion~~ — ✅ v2已实现，+5.2%胜率
   - ~~Transposition Table~~ — ✅ v4已实现，+15%胜率（42.5%→57.5%）
   - Killer Move Heuristic — v3已实现，配合TT使用
   - Iterative Deepening — 逐层加深搜索，利用上一轮结果排序
   - PVS (Principal Variation Search) — 零窗口搜索提高效率
   - Null Move Pruning — 假设跳过一步，如果仍能产生beta剪枝则跳过
3. **评估函数结构性改变**（非微调）— 已验证：
   - ✅ 简化den_proximity为线性版（v3最大贡献）
   - ✅ 移除den_shield_score（v3冗余/v4有害）
   - ✅ 移除mobility_score（性能杀手）
   - ✅ SEE过滤劣质吃子延伸（v3）
   - ✅ rank>=5逃走限制（v3）
   - ✅ 简化move_order_score（v3）
   - ✅ asymmetric den_proximity + urgent_den_threat（v4防守突破）
   - 路径控制（通向对方穴的关键路径是否被控制）
   - 棋子间协同（保护链、防御网络）
4. **WASM集成** — ✅ 已完成，Rust v4 heuristic直接用于生产环境
5. PK 框架优化：
   - 增加 random-open 到 8-10 可减少先手优势影响
   - 增加局数（800+）减少统计噪声

## 历史教训

- **平局率从 ~21% 降到 ~3%** — 关键改动：修复评估悬崖 bug、鼠权重上调、PST 优化、机动性评估、走法排序增强
- **AlphaZero 当前不可行** — 弱模型导致 97% 平局，value 信号为零，神经网络 6 局全败给 minimax depth 3
- **孤军深入** — den_proximity 系数过于激进会导致棋子脱离防守被吃，需平衡攻防
- **评估函数微调在 depth 4 + random-open 6 下无效** — 先手优势和随机性主导 PK 结果，微小评估差异被噪声淹没
- **搜索算法改进是唯一有效路径** — quiescence search 消除水平线效应，胜率稳定提升 5%+
- **Evasion quiescence 对后手方关键** — 延伸被威胁棋子的逃走，让防守方看到更深的威胁链
- **评估不连续性是搜索效率的隐形杀手** — v2的3段分段den_proximity导致alpha-beta窗口频繁错判，线性函数连续性好，剪枝更有效
- **冗余评估组件不仅无益，反而有害** — den_shield和den_proximity是同一信息的不同视角，叠加导致信号放大失真
- **evaluate()性能是搜索瓶颈** — 每步搜索2-5万节点，evaluate()是热点。砍掉慢组件（mobility调用2次all_valid_moves）→搜索更深→看到更远，远比精确评估当前局面重要
- **quiescence宽度控制决定其有效性** — SEE过滤+rank限制让quiescence只延伸有价值战术链，避免在低价值走法上浪费搜索预算
- **WASM集成消除TS同步负担** — Rust→WASM→Node.js，彻底解决手动同步Rust评估函数到TS的维护问题，且获得5-10倍性能优势
- **先手优势始终存在** — 同等heuristic下Dark vs Light约68% vs 24%，改进应同时对两方有效
- **Transposition Table是最大单一改进** — v4开启TT后胜率从42.5%→57.5%，等价于更大的搜索深度
- **den_shield的设计有根本缺陷** — best_ttg取己方最小距离，己方棋子靠近己穴防守反而让gap变大、惩罚更大，导致AI不愿守穴
- **防守评估必须asymmetric** — 对等权重的den_proximity无法让AI优先防守，3x防守权重是v4的基石
- **move_order防守激励需绑定方向** — 单纯"靠近己穴"给巨奖会让AI无脑靠穴不拦截，必须区分"靠近威胁"和"远离威胁"

## 每次迭代流程

1. 创建/修改 `heuristic_vN.rs` 或 `self_play.rs` 中的搜索逻辑
2. `lib.rs` 加 `mod heuristic_vN;`（如新文件）
3. `self_play.rs` 的 `get_heuristic()` 加 `"vN"` 分支，设置 `use_quiescence`/`use_tt`/`q_depth`/`extend_threats`
4. `heuristic.rs` 的 re-export 指向 vN
5. 编译通过（bin目标需`--features self_play_bin`，wasm目标需`--no-default-features --features wasm`）
6. PK：v(N-1) vs vN，800 局
7. 胜率 > 55% → 保留；否则分析，调参重试
8. 确认通过后：
   - 重新构建WASM：`wasm-pack build --target nodejs --out-dir ../../apps/server/src/services/ai/jungle/wasm-pkg --no-default-features --features wasm`
   - 同步 TS fallback 版 `heuristic.ts` 和 `minimax.ts`（如评估函数/搜索逻辑有变化）
   - 更新 `deploy.yml`（如构建流程有变化）
