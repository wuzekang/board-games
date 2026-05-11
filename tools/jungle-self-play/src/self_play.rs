#[cfg(feature = "neural")]
use crate::encoding::encode_board;
#[cfg(feature = "neural")]
use crate::mcts::{MctsArena, MctsConfig};
#[cfg(feature = "neural")]
use crate::neural::get_session_for_color;
use crate::rules::{all_valid_moves, apply_move, get_game_result};
use crate::types::{Board, Color, GameResult, Move, Piece, PieceType, Pos};
use crate::constants::{is_river, is_dark_trap, is_light_trap, ORTHO, opponent_den, manhattan};
#[cfg(feature = "self_play_bin")]
use std::collections::HashMap;
#[cfg(feature = "self_play_bin")]
pub struct PositionRecord {
    pub board: Board,
    pub policy: HashMap<u16, f32>,
    pub color_to_move: Color,
}

#[derive(Clone, Copy)]
pub struct HeuristicFns {
    pub evaluate: fn(&Board, Color) -> i32,
    pub move_order: fn(&Move, &Board, Color) -> i32,
    pub use_quiescence: bool,
    pub use_tt: bool,
    pub q_depth: i32,
    pub extend_threats: bool,
    pub use_nmp: bool,
}

pub fn get_heuristic(version: &str) -> HeuristicFns {
    match version {
        "v1" => HeuristicFns {
            evaluate: crate::heuristic_v1::evaluate_board,
            move_order: crate::heuristic_v1::move_order_score,
            use_quiescence: false,
            use_tt: false,
            q_depth: 0,
            extend_threats: false,
            use_nmp: false,
        },
        "v2" => HeuristicFns {
            evaluate: crate::heuristic_v2::evaluate_board,
            move_order: crate::heuristic_v2::move_order_score,
            use_quiescence: true,
            use_tt: false,
            q_depth: 4,
            extend_threats: false,
            use_nmp: false,
        },
        "v3" | "latest" => HeuristicFns {
            evaluate: crate::heuristic_v3::evaluate_board,
            move_order: crate::heuristic_v3::move_order_score,
            use_quiescence: true,
            use_tt: false,
            q_depth: 4,
            extend_threats: false,
            use_nmp: false,
        },
        "v4" => HeuristicFns {
            evaluate: crate::heuristic_v4::evaluate_board,
            move_order: crate::heuristic_v4::move_order_score,
            use_quiescence: true,
            use_tt: true,
            q_depth: 4,
            extend_threats: false,
            use_nmp: false,
        },
        "v5" => HeuristicFns {
            evaluate: crate::heuristic_v5::evaluate_board,
            move_order: crate::heuristic_v5::move_order_score,
            use_quiescence: true,
            use_tt: true,
            q_depth: 4,
            extend_threats: false,
            use_nmp: true,
        },
        "v5-no-nmp" => HeuristicFns {
            evaluate: crate::heuristic_v5::evaluate_board,
            move_order: crate::heuristic_v5::move_order_score,
            use_quiescence: true,
            use_tt: true,
            q_depth: 4,
            extend_threats: false,
            use_nmp: false,
        },
        "v6" => HeuristicFns {
            evaluate: crate::heuristic_v6::evaluate_board,
            move_order: crate::heuristic_v6::move_order_score,
            use_quiescence: true,
            use_tt: true,
            q_depth: 4,
            extend_threats: false,
            use_nmp: true,
        },
        _ => panic!("Unknown heuristic version: {version}"),
    }
}

const TT_SIZE: usize = 1 << 20;
const TT_MASK: usize = TT_SIZE - 1;

#[derive(Clone, Copy)]
pub(crate) struct TTEntry {
    hash: u64,
    depth: i32,
    score: i32,
    flag: u8,
    best_from: u8,
    best_to: u8,
}

const TT_EXACT: u8 = 0;
const TT_LOWER: u8 = 1;
const TT_UPPER: u8 = 2;

pub(crate) struct TranspositionTable {
    entries: Vec<Option<TTEntry>>,
}

impl TranspositionTable {
    pub(crate) fn new() -> Self {
        Self {
            entries: vec![None; TT_SIZE],
        }
    }

    fn store(&mut self, hash: u64, depth: i32, score: i32, flag: u8, best_from: u8, best_to: u8) {
        let idx = (hash as usize) & TT_MASK;
        let should_replace = match self.entries[idx] {
            None => true,
            Some(e) => e.hash != hash || e.depth <= depth,
        };
        if should_replace {
            self.entries[idx] = Some(TTEntry {
                hash,
                depth,
                score,
                flag,
                best_from,
                best_to,
            });
        }
    }

    fn probe(&self, hash: u64) -> Option<&TTEntry> {
        let idx = (hash as usize) & TT_MASK;
        match self.entries[idx] {
            Some(ref e) if e.hash == hash => Some(e),
            _ => None,
        }
    }

    pub(crate) fn clear(&mut self) {
        for e in self.entries.iter_mut() {
            *e = None;
        }
    }
}

const KILLER_SLOTS: usize = 2;

pub(crate) struct KillerMoveTable {
    killers: Vec<[Option<(u8, u8)>; KILLER_SLOTS]>,
}

impl KillerMoveTable {
    pub(crate) fn new(max_depth: usize) -> Self {
        Self {
            killers: vec![[None; KILLER_SLOTS]; max_depth + 1],
        }
    }

    fn store(&mut self, ply: usize, from_idx: u8, to_idx: u8) {
        if ply < self.killers.len() {
            let slot = &mut self.killers[ply];
            if slot[0] != Some((from_idx, to_idx)) {
                slot[1] = slot[0];
                slot[0] = Some((from_idx, to_idx));
            }
        }
    }

    fn is_killer(&self, ply: usize, from_idx: u8, to_idx: u8) -> bool {
        if ply >= self.killers.len() {
            return false;
        }
        let key = (from_idx, to_idx);
        self.killers[ply][0] == Some(key) || self.killers[ply][1] == Some(key)
    }

    pub(crate) fn clear(&mut self) {
        for slot in self.killers.iter_mut() {
            *slot = [None; KILLER_SLOTS];
        }
    }
}

const HISTORY_SIZE: usize = 63 * 63;

pub(crate) struct HistoryTable {
    scores: [[i32; 63]; 63],
}

impl HistoryTable {
    pub(crate) fn new() -> Self {
        Self {
            scores: [[0; 63]; 63],
        }
    }

    #[inline]
    fn score(&self, from_idx: u8, to_idx: u8) -> i32 {
        self.scores[from_idx as usize][to_idx as usize]
    }

    fn store_bonus(&mut self, from_idx: u8, to_idx: u8, depth: i32) {
        let bonus = depth * depth;
        let fi = from_idx as usize;
        let ti = to_idx as usize;
        self.scores[fi][ti] += bonus;
        if self.scores[fi][ti] > 1_000_000 {
            self.scores[fi][ti] = 1_000_000;
        }
    }

    pub(crate) fn age(&mut self) {
        for row in self.scores.iter_mut() {
            for v in row.iter_mut() {
                *v >>= 1;
            }
        }
    }

    pub(crate) fn clear(&mut self) {
        for row in self.scores.iter_mut() {
            for v in row.iter_mut() {
                *v = 0;
            }
        }
    }
}

pub static ZOBRIST_PIECES: [[u64; 16]; 63] = {
    let mut tables = [[0u64; 16]; 63];
    let mut i = 0;
    while i < 63 {
        let mut j = 0;
        while j < 16 {
            tables[i][j] = splitmix64((i * 16 + j + 1) as u64);
            j += 1;
        }
        i += 1;
    }
    tables
};

pub static ZOBRIST_COLOR: u64 = splitmix64(63 * 16 + 1);

const fn splitmix64(mut x: u64) -> u64 {
    x = x.wrapping_add(0x9e3779b97f4a7c15);
    x = (x ^ (x >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94d049bb133111eb);
    x ^ (x >> 31)
}

fn compute_hash(board: &Board) -> u64 {
    let mut h = 0u64;
    for (i, piece_opt) in board.pieces.iter().enumerate() {
        if let Some(ref p) = piece_opt {
            h ^= ZOBRIST_PIECES[p.pos.idx()][i];
        }
    }
    if board.next_color == Color::Light {
        h ^= ZOBRIST_COLOR;
    }
    h
}

pub fn init_hash(board: &mut Board) {
    board.hash = compute_hash(board);
}

pub fn new_board() -> Board {
    let mut board = Board::new();
    init_hash(&mut board);
    board
}

pub fn new_flipped_board(flip: bool) -> Board {
    let board = Board::new();
    let mut board = if flip { board.flipped() } else { board };
    init_hash(&mut board);
    board
}

#[cfg(feature = "neural")]
pub fn play_one_game_neural(
    mcts_iterations: u32,
    temperature_moves: usize,
    rng: &mut impl rand::Rng,
) -> (Vec<PositionRecord>, GameResult) {
    let mut board = new_board();
    let mut records: Vec<PositionRecord> = Vec::with_capacity(150);
    let mut arena = MctsArena::new();

    let session = get_session_for_color(Color::Dark);
    arena.set_session(session);

    let config = MctsConfig {
        iterations: mcts_iterations,
        c: 1.4,
        use_neural: true,
        dirichlet_alpha: 0.3,
        dirichlet_frac: 0.25,
    };

    loop {
        let current_color = board.next_color;

        arena.set_session(get_session_for_color(current_color));

        if let Some(result) = get_game_result(&board, current_color) {
            return (records, result);
        }

        let moves = all_valid_moves(&board, current_color);
        if moves.is_empty() {
            return (records, GameResult::Winner(current_color.opponent()));
        }

        if moves.len() == 1 {
            let mv = moves[0];
            records.push(PositionRecord {
                board: board.clone(),
                policy: {
                    let mut p = HashMap::new();
                    p.insert(mv.move_idx(), 1.0);
                    p
                },
                color_to_move: current_color,
            });
            board = apply_move(&board, mv);
            continue;
        }

        arena.clear();
        let (best_move_opt, visit_counts) = arena.run_mcts(&board, current_color, &config, rng);

        if visit_counts.is_empty() {
            let mv = moves[rng.gen_range(0..moves.len())];
            records.push(PositionRecord {
                board: board.clone(),
                policy: {
                    let mut p = HashMap::new();
                    p.insert(mv.move_idx(), 1.0);
                    p
                },
                color_to_move: current_color,
            });
            board = apply_move(&board, mv);
            continue;
        }

        let total_visits: u32 = visit_counts.iter().map(|(_, v)| v).sum();
        let policy: HashMap<u16, f32> = visit_counts
            .iter()
            .map(|(m, v)| (m.move_idx(), *v as f32 / total_visits as f32))
            .collect();

        let chosen = if records.len() < temperature_moves {
            let mut r = rng.gen::<f32>() * total_visits as f32;
            let mut pick = visit_counts[0].0;
            for (mv, visits) in &visit_counts {
                r -= *visits as f32;
                if r <= 0.0 {
                    pick = *mv;
                    break;
                }
            }
            pick
        } else {
            best_move_opt.unwrap_or(visit_counts[0].0)
        };

        records.push(PositionRecord {
            board: board.clone(),
            policy,
            color_to_move: current_color,
        });

        board = apply_move(&board, chosen);

        if records.len() > 300 {
            return (records, GameResult::Draw);
        }
    }
}

const INF: i32 = 2_000_000;

fn piece_trapped(pos: Pos, attacker_color: Color) -> bool {
    match attacker_color {
        Color::Dark => is_light_trap(pos),
        Color::Light => is_dark_trap(pos),
    }
}

pub(crate) fn can_be_captured(board: &Board, piece: &Piece) -> bool {
    let opp = piece.color.opponent();
    for &(dr, dc) in &ORTHO {
        let r = piece.pos.row as i16 + dr as i16;
        let c = piece.pos.col as i16 + dc as i16;
        if r < 0 || r >= 9 || c < 0 || c >= 7 {
            continue;
        }
        let adj_pos = Pos::new(r as u8, c as u8);
        if let Some(adj) = board.piece_at(adj_pos) {
            if adj.color == opp {
                let attacker_in_river = is_river(adj.pos);
                let defender_in_river = is_river(piece.pos);
                if attacker_in_river != defender_in_river {
                    continue;
                }
                let mut attacker_rank = adj.piece_type.rank();
                let mut defender_rank = piece.piece_type.rank();
                if piece_trapped(piece.pos, adj.color) {
                    defender_rank = 0;
                }
                if piece_trapped(adj.pos, piece.color) {
                    attacker_rank = 0;
                }
                if attacker_rank == 0 && defender_rank == 0 {
                    return true;
                }
                if adj.piece_type == PieceType::Rat && piece.piece_type == PieceType::Elephant {
                    if !attacker_in_river { return true; }
                } else if adj.piece_type == PieceType::Elephant && piece.piece_type == PieceType::Rat {
                } else if attacker_rank >= defender_rank {
                    return true;
                }
            }
        }
    }
    for &(dr, dc) in &ORTHO {
        let r = piece.pos.row as i16 + dr as i16;
        let c = piece.pos.col as i16 + dc as i16;
        if r < 0 || r >= 9 || c < 0 || c >= 7 {
            continue;
        }
        let adj_pos = Pos::new(r as u8, c as u8);
        if !is_river(adj_pos) {
            continue;
        }
        let mut jump_r = r + dr as i16;
        let mut jump_c = c + dc as i16;
        let mut blocked = false;
        while jump_r >= 0 && jump_r < 9 && jump_c >= 0 && jump_c < 7 && is_river(Pos::new(jump_r as u8, jump_c as u8)) {
            if let Some(rat) = board.piece_at(Pos::new(jump_r as u8, jump_c as u8)) {
                if rat.piece_type == PieceType::Rat {
                    blocked = true;
                    break;
                }
            }
            jump_r += dr as i16;
            jump_c += dc as i16;
        }
        if blocked || jump_r < 0 || jump_r >= 9 || jump_c < 0 || jump_c >= 7 {
            continue;
        }
        let landing = Pos::new(jump_r as u8, jump_c as u8);
        if let Some(jumper) = board.piece_at(landing) {
            if jumper.color == opp && (jumper.piece_type == PieceType::Lion || jumper.piece_type == PieceType::Tiger) {
                if piece_trapped(piece.pos, jumper.color) {
                    return true;
                }
                if jumper.piece_type.rank() >= piece.piece_type.rank() {
                    return true;
                }
                if piece.piece_type == PieceType::Elephant && jumper.piece_type != PieceType::Rat {
                    return true;
                }
            }
        }
    }
    false
}

pub(crate) fn see_value(board: &Board, m: &Move) -> i32 {
    if !m.is_capture {
        return 0;
    }
    let captured = match board.pieces[m.captured_idx as usize].as_ref() {
        Some(p) => p,
        None => return 0,
    };
    let attacker = match board.pieces[m.piece_idx as usize].as_ref() {
        Some(p) => p,
        None => return 0,
    };
    let gain = captured.piece_type.base_value();
    let mut cost = attacker.piece_type.base_value();
    if is_trap_for_opponent(captured.pos, attacker.color) {
        cost = 0;
    }
    if is_trap_for_opponent(attacker.pos, captured.color) {
        return gain;
    }
    if attacker.piece_type == PieceType::Rat && captured.piece_type == PieceType::Elephant {
        return gain;
    }
    if attacker.piece_type == PieceType::Elephant && captured.piece_type == PieceType::Rat {
        return -cost;
    }
    gain - cost
}

#[inline]
fn is_trap_for_opponent(pos: Pos, attacker_color: Color) -> bool {
    match attacker_color {
        Color::Dark => is_light_trap(pos),
        Color::Light => is_dark_trap(pos),
    }
}

pub(crate) fn quiescence(
    board: &Board,
    color: Color,
    alpha: i32,
    beta: i32,
    maximizing: bool,
    ai_color: Color,
    h: HeuristicFns,
    q_depth: i32,
) -> i32 {
    let stand_pat = (h.evaluate)(board, ai_color);

    if q_depth <= 0 {
        return stand_pat;
    }

    let moves = all_valid_moves(board, color);
    let mut tactical: Vec<Move> = moves.iter().filter(|m| m.is_capture && see_value(board, m) >= 0).copied().collect();

    for piece in board.pieces.iter().flatten() {
        if piece.color == color && can_be_captured(board, piece) && piece.piece_type.rank() >= 5 {
            for &m in &moves {
                if board.pieces[m.piece_idx as usize].as_ref().map_or(false, |p| p.pos == piece.pos)
                    && !m.is_capture
                    && !tactical.iter().any(|t| t.piece_idx == m.piece_idx && t.to == m.to)
                {
                    tactical.push(m);
                }
            }
        }
    }

    if tactical.is_empty() {
        return stand_pat;
    }

    let opp_den = opponent_den(color);
    for &m in &tactical {
        if m.to.row == opp_den.row && m.to.col == opp_den.col {
            return if maximizing { INF - 1 } else { -(INF - 1) };
        }
    }

    tactical.sort_by(|a, b| {
        let sa = if a.is_capture { see_value(board, a) } else { 0 };
        let sb = if b.is_capture { see_value(board, b) } else { 0 };
        sb.cmp(&sa)
    });

    if maximizing {
        let mut best = stand_pat.max(alpha);
        let mut a = alpha;
        for &m in &tactical {
            let new_board = apply_move(board, m);
            let val = quiescence(&new_board, color.opponent(), a, beta, false, ai_color, h, q_depth - 1);
            best = best.max(val);
            a = a.max(best);
            if beta <= a {
                break;
            }
        }
        best
    } else {
        let mut best = stand_pat.min(beta);
        let mut b = beta;
        for &m in &tactical {
            let new_board = apply_move(board, m);
            let val = quiescence(&new_board, color.opponent(), alpha, b, true, ai_color, h, q_depth - 1);
            best = best.min(val);
            b = b.min(best);
            if b <= alpha {
                break;
            }
        }
        best
    }
}

fn minimax(
    board: &Board,
    color: Color,
    depth: i32,
    alpha: i32,
    beta: i32,
    maximizing: bool,
    ai_color: Color,
    h: HeuristicFns,
) -> (i32, Option<Move>) {
    if let Some(result) = get_game_result(board, color) {
        let val = match result {
            GameResult::Winner(w) if w == ai_color => INF - 1,
            GameResult::Winner(_) => -(INF - 1),
            GameResult::Draw => 0,
        };
        return (val, None);
    }

    if depth == 0 {
        if h.use_quiescence {
            return (quiescence(board, color, alpha, beta, maximizing, ai_color, h, h.q_depth), None);
        }
        return ((h.evaluate)(board, ai_color), None);
    }

    let extend = if h.extend_threats && depth == 1 {
        let mut ext = 0i32;
        for piece in board.pieces.iter().flatten() {
            if piece.color == color && can_be_captured(board, piece) {
                if piece.piece_type == PieceType::Elephant {
                    ext = 1;
                    break;
                }
            }
        }
        if ext == 0 {
            let own_den_pos = crate::constants::own_den(color);
            for piece in board.pieces.iter().flatten() {
                if piece.color != color && manhattan(piece.pos, own_den_pos) <= 2 {
                    ext = 1;
                    break;
                }
            }
        }
        ext
    } else {
        0
    };
    let depth_with_ext = depth + extend;

    let moves = all_valid_moves(board, color);
    if moves.is_empty() {
        return (-(INF - 1), None);
    }

    let opp_den = crate::constants::opponent_den(color);
    for &m in &moves {
        if m.to.row == opp_den.row && m.to.col == opp_den.col {
            return (INF - 1, Some(m));
        }
    }

    let mut sorted: Vec<Move> = moves.to_vec();
    sorted.sort_by(|a, b| {
        (h.move_order)(b, board, color)
            .cmp(&(h.move_order)(a, board, color))
    });

    if maximizing {
        let mut best_val = i32::MIN;
        let mut best_mv = sorted[0];
        let mut a = alpha;
        for &m in &sorted {
            let new_board = apply_move(board, m);
            let (val, _) = minimax(&new_board, color.opponent(), depth_with_ext - 1, a, beta, false, ai_color, h);
            if val > best_val {
                best_val = val;
                best_mv = m;
            }
            a = a.max(best_val);
            if beta <= a {
                break;
            }
        }
        (best_val, Some(best_mv))
    } else {
        let mut best_val = i32::MAX;
        let mut best_mv = sorted[0];
        let mut b = beta;
        for &m in &sorted {
            let new_board = apply_move(board, m);
            let (val, _) = minimax(&new_board, color.opponent(), depth_with_ext - 1, alpha, b, true, ai_color, h);
            if val < best_val {
                best_val = val;
                best_mv = m;
            }
            b = b.min(best_val);
            if b <= alpha {
                break;
            }
        }
        (best_val, Some(best_mv))
    }
}

pub(crate) fn minimax_v3(
    board: &Board,
    color: Color,
    depth: i32,
    alpha: i32,
    beta: i32,
    maximizing: bool,
    ai_color: Color,
    h: HeuristicFns,
    ply: usize,
    tt: &mut TranspositionTable,
    killers: &mut KillerMoveTable,
    history: &mut HistoryTable,
    do_null: bool,
) -> (i32, Option<Move>) {
    let hash = board.hash;

    if let Some(result) = get_game_result(board, color) {
        let val = match result {
            GameResult::Winner(w) if w == ai_color => INF - 1,
            GameResult::Winner(_) => -(INF - 1),
            GameResult::Draw => 0,
        };
        return (val, None);
    }

    if depth == 0 {
        if h.use_quiescence {
            return (quiescence(board, color, alpha, beta, maximizing, ai_color, h, h.q_depth), None);
        }
        return ((h.evaluate)(board, ai_color), None);
    }

    let mut alpha = alpha;
    let mut beta = beta;

    if let Some(entry) = tt.probe(hash) {
        if entry.depth >= depth && entry.flag == TT_EXACT {
            return (entry.score, None);
        }
        if entry.flag == TT_LOWER {
            alpha = alpha.max(entry.score);
        }
        if entry.flag == TT_UPPER {
            beta = beta.min(entry.score);
        }
        if alpha >= beta {
            return (entry.score, None);
        }
    }

    let null_depth = depth - 3;
    if h.use_nmp && do_null && null_depth > 0 && !maximizing && board.piece_count(color) > 1 {
        let null_board = Board {
            next_color: color.opponent(),
            half_move_clock: board.half_move_clock + 1,
            hash: board.hash ^ ZOBRIST_COLOR,
            ..board.clone()
        };
        let (null_val, _) = minimax_v3(
            &null_board, color.opponent(), null_depth, alpha, beta, true,
            ai_color, h, ply + 1, tt, killers, history, false,
        );
        if null_val >= beta {
            return (null_val, None);
        }
    }
    if h.use_nmp && do_null && null_depth > 0 && maximizing && board.piece_count(color.opponent()) > 1 {
        let null_board = Board {
            next_color: color.opponent(),
            half_move_clock: board.half_move_clock + 1,
            hash: board.hash ^ ZOBRIST_COLOR,
            ..board.clone()
        };
        let (null_val, _) = minimax_v3(
            &null_board, color.opponent(), null_depth, alpha, beta, false,
            ai_color, h, ply + 1, tt, killers, history, false,
        );
        if null_val <= alpha {
            return (null_val, None);
        }
    }

    let moves = all_valid_moves(board, color);
    if moves.is_empty() {
        return (-(INF - 1), None);
    }

    let opp_den = crate::constants::opponent_den(color);
    for &m in &moves {
        if m.to.row == opp_den.row && m.to.col == opp_den.col {
            return (INF - 1, Some(m));
        }
    }

    let mut sorted: Vec<Move> = moves.to_vec();

    let tt_best_from_to: Option<(u8, u8)> = tt.probe(hash).and_then(|e| {
        if e.best_from < 63 && e.best_to < 63 {
            Some((e.best_from, e.best_to))
        } else {
            None
        }
    });

    sorted.sort_by(|a, b| {
        let mut sa = (h.move_order)(a, board, color);
        let mut sb = (h.move_order)(b, board, color);
        if let Some((ff, ft)) = tt_best_from_to {
            if a.from.idx() as u8 == ff && a.to.idx() as u8 == ft { sa += 50000; }
            if b.from.idx() as u8 == ff && b.to.idx() as u8 == ft { sb += 50000; }
        }
        if !a.is_capture && killers.is_killer(ply, a.from.idx() as u8, a.to.idx() as u8) { sa += 40000; }
        if !b.is_capture && killers.is_killer(ply, b.from.idx() as u8, b.to.idx() as u8) { sb += 40000; }
        if !a.is_capture { sa += history.score(a.from.idx() as u8, a.to.idx() as u8); }
        if !b.is_capture { sb += history.score(b.from.idx() as u8, b.to.idx() as u8); }
        sb.cmp(&sa)
    });

    let result = if maximizing {
        let mut best_val = i32::MIN;
        let mut best_from: u8 = 63;
        let mut best_to: u8 = 63;
        let mut best_mv: Move = sorted[0];
        let mut a = alpha;
        for &m in &sorted {
            let new_board = apply_move(board, m);
            let (val, _) = minimax_v3(&new_board, color.opponent(), depth - 1, a, beta, false, ai_color, h, ply + 1, tt, killers, history, true);
            if val > best_val {
                best_val = val;
                best_mv = m;
                best_from = m.from.idx() as u8;
                best_to = m.to.idx() as u8;
            }
            a = a.max(best_val);
            if beta <= a {
                if !m.is_capture {
                    killers.store(ply, m.from.idx() as u8, m.to.idx() as u8);
                    history.store_bonus(m.from.idx() as u8, m.to.idx() as u8, depth);
                }
                break;
            }
        }
        let flag = if best_val <= alpha { TT_UPPER } else if best_val >= beta { TT_LOWER } else { TT_EXACT };
        tt.store(hash, depth, best_val, flag, best_from, best_to);
        (best_val, Some(best_mv))
    } else {
        let mut best_val = i32::MAX;
        let mut best_from: u8 = 63;
        let mut best_to: u8 = 63;
        let mut best_mv: Move = sorted[0];
        let mut b = beta;
        for &m in &sorted {
            let new_board = apply_move(board, m);
            let (val, _) = minimax_v3(&new_board, color.opponent(), depth - 1, alpha, b, true, ai_color, h, ply + 1, tt, killers, history, true);
            if val < best_val {
                best_val = val;
                best_mv = m;
                best_from = m.from.idx() as u8;
                best_to = m.to.idx() as u8;
            }
            b = b.min(best_val);
            if b <= alpha {
                if !m.is_capture {
                    killers.store(ply, m.from.idx() as u8, m.to.idx() as u8);
                    history.store_bonus(m.from.idx() as u8, m.to.idx() as u8, depth);
                }
                break;
            }
        }
        let flag = if best_val <= alpha { TT_UPPER } else if best_val >= beta { TT_LOWER } else { TT_EXACT };
        tt.store(hash, depth, best_val, flag, best_from, best_to);
        (best_val, Some(best_mv))
    };

    result
}


pub fn minimax_root_wasm(
    board: &Board,
    color: Color,
    depth: i32,
    tt: &mut TranspositionTable,
    killers: &mut KillerMoveTable,
    history: &mut HistoryTable,
) -> Option<Move> {
    let h = get_heuristic("v5");
    let moves = all_valid_moves(board, color);
    if moves.is_empty() {
        return None;
    }

    let opp_den = crate::constants::opponent_den(color);
    if let Some(&win_mv) = moves.iter().find(|m| m.to == opp_den) {
        return Some(win_mv);
    }

    let mut best_move: Option<Move> = None;

    for d in 1..=depth {
        let (_val, mv) = minimax_v3(board, color, d, i32::MIN, i32::MAX, true, color, h, 0, tt, killers, history, false);
        if let Some(m) = mv {
            best_move = Some(m);
        }
    }

    best_move
}


#[cfg(feature = "self_play_bin")]
fn depth_for_move(move_count: usize) -> i32 {
    if move_count < 10 { 4 } else if move_count < 40 { 4 } else { 3 }
}

#[cfg(feature = "self_play_bin")]
pub fn play_one_game(
    h: HeuristicFns,
    temperature: f32,
    random_open: usize,
    flip: bool,
    rng: &mut impl rand::Rng,
) -> (Vec<PositionRecord>, GameResult) {
    let mut board = new_flipped_board(flip);
    let mut records: Vec<PositionRecord> = Vec::with_capacity(150);

    loop {
        let current_color = board.next_color;

        if let Some(result) = get_game_result(&board, current_color) {
            return (records, result);
        }

        let moves = all_valid_moves(&board, current_color);
        if moves.is_empty() {
            return (records, GameResult::Winner(current_color.opponent()));
        }

        if moves.len() == 1 {
            let mv = moves[0];
            records.push(PositionRecord {
                board: board.clone(),
                policy: {
                    let mut p = HashMap::new();
                    p.insert(mv.move_idx(), 1.0);
                    p
                },
                color_to_move: current_color,
            });
            board = apply_move(&board, mv);
            continue;
        }

        let opp_den = crate::constants::opponent_den(current_color);
        let instant_win = moves.iter().find(|m| m.to.row == opp_den.row && m.to.col == opp_den.col);
        if let Some(&mv) = instant_win {
            records.push(PositionRecord {
                board: board.clone(),
                policy: {
                    let mut p = HashMap::new();
                    p.insert(mv.move_idx(), 1.0);
                    p
                },
                color_to_move: current_color,
            });
            board = apply_move(&board, mv);
            continue;
        }

        let depth = depth_for_move(records.len());
        let (_, best_move_opt) = minimax(
            &board,
            current_color,
            depth,
            i32::MIN,
            i32::MAX,
            true,
            current_color,
            h,
        );
        let best_move = best_move_opt.unwrap_or(moves[0]);

        let mut scores: Vec<i32> = Vec::with_capacity(moves.len());
        for &m in &moves {
            let new_board = apply_move(&board, m);
            let (val, _) = minimax(
                &new_board,
                current_color.opponent(),
                (depth - 1).max(0),
                i32::MIN,
                i32::MAX,
                false,
                current_color,
                h,
            );
            scores.push(-val);
        }

        let max_score = *scores.iter().max().unwrap_or(&0);
        let weights: Vec<f32> = scores
            .iter()
            .map(|&s| {
                let shifted = (s as f32 - max_score as f32).max(-500.0);
                (shifted / temperature).exp()
            })
            .collect();
        let sum: f32 = weights.iter().sum();
        let policy: HashMap<u16, f32> = moves
            .iter()
            .zip(weights.iter())
            .map(|(m, &w)| (m.move_idx(), w / sum))
            .collect();

        let chosen = if records.len() < random_open {
            moves[rng.gen_range(0..moves.len())]
        } else if records.len() < 20 && temperature > 0.0 {
            let mut r = rng.gen::<f32>() * sum;
            let mut pick = moves[0];
            for (i, w) in weights.iter().enumerate() {
                r -= w;
                if r <= 0.0 {
                    pick = moves[i];
                    break;
                }
            }
            pick
        } else {
            best_move
        };

        records.push(PositionRecord {
            board: board.clone(),
            policy,
            color_to_move: current_color,
        });

        board = apply_move(&board, chosen);

        if records.len() > 300 {
            return (records, GameResult::Draw);
        }
    }
}

#[cfg(feature = "neural")]
#[derive(serde::Serialize)]
pub struct TrainingSample {
    pub board_state: Vec<f32>,
    pub policy_target: HashMap<String, f32>,
    pub value_target: f32,
    pub move_number: u16,
    pub color_to_move: u8,
}

#[cfg(feature = "neural")]
impl TrainingSample {
    pub fn from_record(record: &PositionRecord, _game_result: GameResult) -> Self {
        let score = (crate::heuristic_v2::evaluate_board)(&record.board, record.color_to_move);
        let clamped = score.max(-8000).min(8000) as f32;
        let value_target = 2.0 / (1.0 + (-clamped / 8000.0).exp()) - 1.0;

        let policy_target: HashMap<String, f32> = record
            .policy
            .iter()
            .map(|(&k, &v)| (k.to_string(), v))
            .collect();

        TrainingSample {
            board_state: encode_board(&record.board),
            policy_target,
            value_target,
            move_number: record.board.half_move_clock,
            color_to_move: record.color_to_move.as_u8(),
        }
    }
}

#[derive(serde::Serialize)]
#[cfg(feature = "self_play_bin")]
pub struct PkMmResult {
    pub heuristic_a: String,
    pub heuristic_b: String,
    pub a_wins: u32,
    pub b_wins: u32,
    pub draws: u32,
    pub total: u32,
    pub a_as_dark_wins: u32,
    pub a_as_dark_total: u32,
    pub a_as_light_wins: u32,
    pub a_as_light_total: u32,
    pub games: Vec<PkMmGameResult>,
}

#[derive(serde::Serialize)]
#[cfg(feature = "self_play_bin")]
pub struct PkMmGameResult {
    pub game_idx: u32,
    pub winner: String,
    pub moves: usize,
    pub dark_heuristic: String,
    pub light_heuristic: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub move_log: Vec<String>,
}

#[cfg(feature = "self_play_bin")]
pub fn play_pk_mm_game(
    h_dark: HeuristicFns,
    h_light: HeuristicFns,
    max_depth: i32,
    random_open: usize,
    rng: &mut impl rand::Rng,
) -> (GameResult, usize, Vec<String>) {
    let mut board = new_board();
    let mut move_count: usize = 0;
    let mut move_log: Vec<String> = Vec::new();
    let mut tt_dark = TranspositionTable::new();
    let mut tt_light = TranspositionTable::new();
    let mut killers_dark = KillerMoveTable::new(max_depth as usize + 1);
    let mut killers_light = KillerMoveTable::new(max_depth as usize + 1);
    let mut history_dark = HistoryTable::new();
    let mut history_light = HistoryTable::new();

    loop {
        let current_color = board.next_color;

        if let Some(result) = get_game_result(&board, current_color) {
            return (result, move_count, move_log);
        }

        let moves = all_valid_moves(&board, current_color);
        if moves.is_empty() {
            return (GameResult::Winner(current_color.opponent()), move_count, move_log);
        }

        let h = match current_color {
            Color::Dark => h_dark,
            Color::Light => h_light,
        };

        let opp_den = crate::constants::opponent_den(current_color);
        let instant_win = moves.iter().find(|m| m.to.row == opp_den.row && m.to.col == opp_den.col);
        let chosen = if let Some(&mv) = instant_win {
            mv
        } else if move_count < random_open {
            moves[rng.gen_range(0..moves.len())]
        } else {
            let depth = depth_for_move(move_count).min(max_depth);
            if h.use_tt {
                let tt = match current_color {
                    Color::Dark => &mut tt_dark,
                    Color::Light => &mut tt_light,
                };
                let killers = match current_color {
                    Color::Dark => &mut killers_dark,
                    Color::Light => &mut killers_light,
                };
                let history = match current_color {
                    Color::Dark => &mut history_dark,
                    Color::Light => &mut history_light,
                };
                history.age();
                let mut best_move: Option<Move> = None;
                for d in 1..=depth {
                    let (val, mv_opt) = minimax_v3(
                        &board, current_color, d, i32::MIN, i32::MAX, true, current_color, h, 0, tt, killers, history, false,
                    );
                    if let Some(mv) = mv_opt {
                        best_move = Some(mv);
                    }
                    let _ = val;
                }
                best_move.unwrap_or(moves[0])
            } else {
                let (_, best_move_opt) = minimax(
                    &board,
                    current_color,
                    depth,
                    i32::MIN,
                    i32::MAX,
                    true,
                    current_color,
                    h,
                );
                best_move_opt.unwrap_or(moves[0])
            }
        };

        let piece = board.pieces[chosen.piece_idx as usize]
            .as_ref()
            .map(|p| format!("{:?}{:?}", p.piece_type, p.color))
            .unwrap_or_default();
        let h_tag = match current_color {
            Color::Dark => "D",
            Color::Light => "L",
        };
        let capture_tag = if chosen.is_capture {
            let cap = board.pieces[chosen.captured_idx as usize]
                .as_ref()
                .map(|p| format!("x{:?}{:?}", p.piece_type, p.color))
                .unwrap_or_default();
            cap
        } else {
            String::new()
        };
        move_log.push(format!(
            "{}{}:{}→{}{}",
            move_count + 1,
            h_tag,
            piece,
            chosen.to,
            capture_tag
        ));

        board = apply_move(&board, chosen);
        move_count += 1;

        if move_count > 300 {
            return (GameResult::Draw, move_count, move_log);
        }
    }
}

#[cfg(feature = "neural")]
#[derive(serde::Serialize)]
#[cfg(feature = "neural")]
pub struct PkResult {
    pub dark_wins: u32,
    pub light_wins: u32,
    pub draws: u32,
    pub total: u32,
    pub games: Vec<PkGameResult>,
}

#[cfg(feature = "neural")]
#[derive(serde::Serialize)]
#[cfg(feature = "neural")]
pub struct PkGameResult {
    pub game_idx: u32,
    pub winner: String,
    pub moves: usize,
    pub dark_model: String,
    pub light_model: String,
    pub final_score_dark: i32,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    pub move_log: Vec<String>,
}

#[cfg(feature = "neural")]
pub fn play_pk_game(
    mcts_iterations: u32,
    rng: &mut impl rand::Rng,
) -> (GameResult, usize, i32) {
    let mut board = new_board();
    let mut arena = MctsArena::new();
    let config = MctsConfig {
        iterations: mcts_iterations,
        c: 1.4,
        use_neural: true,
        dirichlet_alpha: 0.3,
        dirichlet_frac: 0.25,
    };
    let mut move_count: usize = 0;

    loop {
        let current_color = board.next_color;
        arena.set_session(get_session_for_color(current_color));

        if let Some(result) = get_game_result(&board, current_color) {
            let score = crate::heuristic_v2::evaluate_board(&board, Color::Dark);
            return (result, move_count, score);
        }

        let moves = all_valid_moves(&board, current_color);
        if moves.is_empty() {
            let score = crate::heuristic_v2::evaluate_board(&board, Color::Dark);
            return (GameResult::Winner(current_color.opponent()), move_count, score);
        }

        arena.clear();
        let (best_move_opt, visit_counts) = arena.run_mcts(&board, current_color, &config, rng);

        let chosen = if visit_counts.is_empty() {
            moves[rng.gen_range(0..moves.len())]
        } else {
            let total_visits: u32 = visit_counts.iter().map(|(_, v)| v).sum();
            let best = best_move_opt.unwrap_or(visit_counts[0].0);
            if move_count < 10 && total_visits > 0 {
                let mut r = rng.gen::<f32>() * total_visits as f32;
                let mut pick = visit_counts[0].0;
                for (mv, visits) in &visit_counts {
                    r -= *visits as f32;
                    if r <= 0.0 {
                        pick = *mv;
                        break;
                    }
                }
                pick
            } else {
                best
            }
        };

        board = apply_move(&board, chosen);
        move_count += 1;

        if move_count > 300 {
            let score = crate::heuristic_v2::evaluate_board(&board, Color::Dark);
            return (GameResult::Draw, move_count, score);
        }
    }
}

#[cfg(feature = "neural")]
pub fn play_pk_mixed_game(
    dark_is_minimax: bool,
    mcts_iterations: u32,
    minimax_depth: i32,
    model_path: &str,
    rng: &mut impl rand::Rng,
) -> (GameResult, usize, Vec<String>) {
    let mut board = new_board();
    let mut arena = MctsArena::new();
    let config = MctsConfig {
        iterations: mcts_iterations,
        c: 1.4,
        use_neural: true,
        dirichlet_alpha: 0.3,
        dirichlet_frac: 0.25,
    };
    let mut move_count: usize = 0;
    let mut move_log: Vec<String> = Vec::new();
    let h = get_heuristic("v1");

    loop {
        let current_color = board.next_color;

        if let Some(result) = get_game_result(&board, current_color) {
            return (result, move_count, move_log);
        }

        let moves = all_valid_moves(&board, current_color);
        if moves.is_empty() {
            return (GameResult::Winner(current_color.opponent()), move_count, move_log);
        }

        let is_minimax_turn = (current_color == Color::Dark && dark_is_minimax)
            || (current_color == Color::Light && !dark_is_minimax);

        let chosen = if is_minimax_turn {
            let depth = depth_for_move(move_count).min(minimax_depth);
            let (_, best_move_opt) = minimax(
                &board,
                current_color,
                depth,
                i32::MIN,
                i32::MAX,
                true,
                current_color,
                h,
            );
            best_move_opt.unwrap_or(moves[0])
        } else {
            crate::neural::init_thread_session(model_path)
                .expect("Failed to init neural session");
            arena.set_session(crate::neural::get_session_for_color(current_color));

            arena.clear();
            let (best_move_opt, visit_counts) =
                arena.run_mcts(&board, current_color, &config, rng);

            if visit_counts.is_empty() {
                moves[rng.gen_range(0..moves.len())]
            } else {
                let total_visits: u32 = visit_counts.iter().map(|(_, v)| v).sum();
                let best = best_move_opt.unwrap_or(visit_counts[0].0);
                if move_count < 10 && total_visits > 0 {
                    let mut r = rng.gen::<f32>() * total_visits as f32;
                    let mut pick = visit_counts[0].0;
                    for (mv, visits) in &visit_counts {
                        r -= *visits as f32;
                        if r <= 0.0 {
                            pick = *mv;
                            break;
                        }
                    }
                    pick
                } else {
                    best
                }
            }
        };

        let piece = board.pieces[chosen.piece_idx as usize]
            .as_ref()
            .map(|p| format!("{:?}{:?}", p.piece_type, p.color))
            .unwrap_or_default();
        let color_tag = if is_minimax_turn { "M" } else { "N" };
        let capture_tag = if chosen.is_capture {
            let cap = board.pieces[chosen.captured_idx as usize]
                .as_ref()
                .map(|p| format!("x{:?}{:?}", p.piece_type, p.color))
                .unwrap_or_default();
            cap
        } else {
            String::new()
        };
        move_log.push(format!(
            "{}{}:{}→{}{}",
            move_count + 1,
            color_tag,
            piece,
            chosen.to,
            capture_tag
        ));

        board = apply_move(&board, chosen);
        move_count += 1;

        if move_count > 300 {
            return (GameResult::Draw, move_count, move_log);
        }
    }
}
