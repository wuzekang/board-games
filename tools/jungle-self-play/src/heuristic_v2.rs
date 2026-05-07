use crate::constants::{
    is_dark_trap, is_light_trap, is_river, manhattan, opponent_den, own_den, ORTHO,
};
use crate::types::{Board, Color, Move, Piece, PieceType, Pos};

const BASE_VALUES: [i32; 8] = [900, 750, 650, 500, 400, 300, 200, 350];

const ELEPHANT_PST: [[i16; 7]; 9] = [
    [0, 10, 15, 25, 15, 10, 0],
    [10, 15, 25, 30, 25, 15, 10],
    [10, 20, 25, 30, 25, 20, 10],
    [5, 15, 20, 30, 20, 15, 5],
    [0, 5, 10, 25, 10, 5, 0],
    [-5, 0, 5, 20, 5, 0, -5],
    [-5, -5, 0, 5, 0, -5, -5],
    [-10, -5, -5, 0, -5, -5, -10],
    [-10, -10, 0, -5, 0, -10, -10],
];

const LION_PST: [[i16; 7]; 9] = [
    [5, 15, 25, 0, 25, 15, 5],
    [10, 20, 30, 35, 30, 20, 10],
    [10, 20, 25, 25, 25, 20, 10],
    [5, 15, 15, 15, 15, 15, 5],
    [0, 10, 10, 8, 10, 10, 0],
    [0, 10, 10, 8, 10, 10, 0],
    [5, 12, 12, 10, 12, 12, 5],
    [0, 5, 5, 5, 5, 5, 0],
    [-5, 0, 8, -5, 8, 0, -5],
];

const TIGER_PST: [[i16; 7]; 9] = LION_PST;

const LEOPARD_PST: [[i16; 7]; 9] = [
    [0, 5, 10, 15, 10, 5, 0],
    [5, 10, 15, 20, 15, 10, 5],
    [5, 10, 15, 20, 15, 10, 5],
    [0, 10, 15, 15, 15, 10, 0],
    [0, 5, 10, 15, 10, 5, 0],
    [0, 0, 5, 10, 5, 0, 0],
    [-5, 0, 0, 5, 0, 0, -5],
    [-5, -5, -5, 0, -5, -5, -5],
    [-10, -10, 0, -10, 0, -10, -10],
];

const DOG_PST: [[i16; 7]; 9] = [
    [0, 5, 8, 10, 8, 5, 0],
    [5, 8, 10, 12, 10, 8, 5],
    [5, 8, 10, 15, 10, 8, 5],
    [0, 5, 8, 10, 8, 5, 0],
    [0, 0, 5, 8, 5, 0, 0],
    [0, 0, 0, 5, 0, 0, 0],
    [-5, -5, 0, 0, 0, -5, -5],
    [-5, -5, -5, 5, -5, -5, -5],
    [-10, -10, 5, -10, 5, -10, -10],
];

const WOLF_PST: [[i16; 7]; 9] = DOG_PST;

const CAT_PST: [[i16; 7]; 9] = [
    [0, 3, 5, 8, 5, 3, 0],
    [3, 5, 8, 10, 8, 5, 3],
    [3, 5, 8, 10, 8, 5, 3],
    [0, 3, 5, 8, 5, 3, 0],
    [0, 0, 3, 5, 3, 0, 0],
    [0, 0, 0, 3, 0, 0, 0],
    [-5, -5, 0, 0, 0, -5, -5],
    [-5, -5, -5, 5, -5, -5, -5],
    [-8, -8, 0, -8, 0, -8, -8],
];

const RAT_PST: [[i16; 7]; 9] = [
    [0, 12, 18, 25, 18, 12, 0],
    [12, 18, 22, 30, 22, 18, 12],
    [12, 22, 28, 30, 28, 22, 12],
    [5, 38, 38, 18, 38, 38, 5],
    [5, 35, 35, 15, 35, 35, 5],
    [5, 32, 32, 15, 32, 32, 5],
    [0, 12, 12, 15, 12, 12, 0],
    [-5, 0, 2, 5, 2, 0, -5],
    [-10, -10, 0, -5, 0, -10, -10],
];

const PST: [&[[i16; 7]; 9]; 8] = [
    &ELEPHANT_PST,
    &LION_PST,
    &TIGER_PST,
    &LEOPARD_PST,
    &DOG_PST,
    &WOLF_PST,
    &CAT_PST,
    &RAT_PST,
];

#[inline]
fn pst_value(piece: &Piece) -> i32 {
    let table = PST[piece.piece_type as usize];
    let row = if piece.color == Color::Dark {
        piece.pos.row as usize
    } else {
        8 - piece.pos.row as usize
    };
    let col = piece.pos.col as usize;
    table[row.min(8)][col.min(6)] as i32
}

fn counter_bonus(board: &Board, color: Color) -> i32 {
    let opp = color.opponent();
    let has_type = |c: Color, pt: PieceType| {
        board.pieces.iter().any(|p| {
            p.as_ref().map_or(false, |p| p.piece_type == pt && p.color == c)
        })
    };

    let mut bonus = 0;
    if has_type(opp, PieceType::Elephant) && has_type(color, PieceType::Rat) {
        bonus += 500;
    }
    if has_type(color, PieceType::Elephant) && !has_type(color, PieceType::Rat)
        && has_type(opp, PieceType::Rat)
    {
        bonus -= 400;
    }
    if has_type(opp, PieceType::Elephant) {
        let rat_in_river = board.pieces.iter().any(|p| {
            p.as_ref().map_or(false, |p| {
                p.color == color && p.piece_type == PieceType::Rat && is_river(p.pos)
            })
        });
        if rat_in_river {
            bonus += 200;
        }
    }
    bonus
}

fn trap_control_score(board: &Board, color: Color) -> i32 {
    let opp_trap_fn = match color {
        Color::Dark => is_light_trap,
        Color::Light => is_dark_trap,
    };
    let mut score = 0;
    for piece in board.pieces.iter().flatten() {
        if piece.color == color && opp_trap_fn(piece.pos) {
            score += 100;
        }
    }
    score
}

fn den_proximity_score(board: &Board, ai_color: Color) -> i32 {
    let opp_den = opponent_den(ai_color);
    let own_den_pos = own_den(ai_color);
    let mut score = 0i32;

    for piece in board.pieces.iter().flatten() {
        let rank = piece.piece_type.rank() as i32;
        if piece.color == ai_color {
            let d = manhattan(piece.pos, opp_den).min(12);
            score += rank * 15 * (12 - d);
            score += rank * 50 * (6 - d).max(0);
            score += rank * 200 * (3 - d).max(0);
        } else {
            let d = manhattan(piece.pos, own_den_pos).min(12);
            score -= rank * 15 * (12 - d);
            score -= rank * 50 * (6 - d).max(0);
            score -= rank * 200 * (3 - d).max(0);
        }
    }
    score
}

fn threat_rank(piece: &Piece) -> i32 {
    piece.piece_type.rank() as i32
}

fn den_shield_score(board: &Board, color: Color) -> i32 {
    let own_den_pos = own_den(color);
    let mut best_ttg = 99i32;

    for piece in board.pieces.iter().flatten() {
        let dist = manhattan(piece.pos, own_den_pos);
        if piece.color == color && dist < best_ttg {
            best_ttg = dist;
        }
    }

    let mut score = 0i32;

    for enemy in board.pieces.iter().flatten() {
        if enemy.color == color {
            continue;
        }
        let ttd = manhattan(enemy.pos, own_den_pos);
        if ttd > 10 {
            continue;
        }

        let gap = ttd - best_ttg;
        let tr = threat_rank(enemy);

        score -= match gap {
            g if g <= -2 => 1500 * tr,
            -1 => 900 * tr,
            0 => 600 * tr,
            1 => 300 * tr,
            2 => 150 * tr,
            3 => 75 * tr,
            4 => 40 * tr,
            5 => 20 * tr,
            _ => gap * 8,
        };
    }

    score
}

fn rat_hunt_score(board: &Board, color: Color) -> i32 {
    let opp = color.opponent();
    let opp_has_elephant = board.pieces.iter().any(|p| {
        p.as_ref().map_or(false, |p| p.piece_type == PieceType::Elephant && p.color == opp)
    });
    if !opp_has_elephant {
        return 0;
    }

    let own_rats: Vec<Pos> = board
        .pieces
        .iter()
        .filter_map(|p| {
            p.as_ref()
                .filter(|p| p.piece_type == PieceType::Rat && p.color == color)
                .map(|p| p.pos)
        })
        .collect();
    if own_rats.is_empty() {
        return 0;
    }

    let opp_elephants: Vec<Pos> = board
        .pieces
        .iter()
        .filter_map(|p| {
            p.as_ref()
                .filter(|p| p.piece_type == PieceType::Elephant && p.color == opp)
                .map(|p| p.pos)
        })
        .collect();

    let mut score = 0i32;
    for &rat_pos in &own_rats {
        for &ele_pos in &opp_elephants {
            let dist = manhattan(rat_pos, ele_pos);
            if dist <= 2 {
                score += 150;
            } else if dist <= 4 {
                score += 80;
            } else if dist <= 6 {
                score += 30;
            }
        }
    }
    score
}

fn is_in_jump_lane(from: Pos, to: Pos, pos: Pos) -> bool {
    if from.row == to.row {
        let min_c = from.col.min(to.col);
        let max_c = from.col.max(to.col);
        return pos.row == from.row && pos.col > min_c && pos.col < max_c;
    }
    if from.col == to.col {
        let min_r = from.row.min(to.row);
        let max_r = from.row.max(to.row);
        return pos.col == from.col && pos.row > min_r && pos.row < max_r;
    }
    false
}

fn rat_river_block_score(board: &Board, color: Color) -> i32 {
    let opp = color.opponent();
    let own_den_pos = own_den(color);

    let enemy_jumpers: Vec<&Piece> = board
        .pieces
        .iter()
        .filter_map(|p| {
            p.as_ref().filter(|p| {
                p.color == opp
                    && (p.piece_type == PieceType::Lion || p.piece_type == PieceType::Tiger)
            })
        })
        .collect();

    let own_rats_in_river: Vec<Pos> = board
        .pieces
        .iter()
        .filter_map(|p| {
            p.as_ref()
                .filter(|p| p.color == color && p.piece_type == PieceType::Rat && is_river(p.pos))
                .map(|p| p.pos)
        })
        .collect();

    let mut score = 0i32;

    for jumper in &enemy_jumpers {
        for &(dr, dc) in &ORTHO {
            let mut r = jumper.pos.row as i16 + dr as i16;
            let mut c = jumper.pos.col as i16 + dc as i16;

            if r < 0 || r >= 9 || c < 0 || c >= 7 {
                continue;
            }
            if !is_river(Pos::new(r as u8, c as u8)) {
                continue;
            }

            let from = jumper.pos;
            while r >= 0 && r < 9 && c >= 0 && c < 7 && is_river(Pos::new(r as u8, c as u8)) {
                r += dr as i16;
                c += dc as i16;
            }

            if r < 0 || r >= 9 || c < 0 || c >= 7 {
                continue;
            }
            let landing = Pos::new(r as u8, c as u8);
            let dist_to_den = manhattan(landing, own_den_pos);
            if dist_to_den > 5 {
                continue;
            }

            let blocked = own_rats_in_river
                .iter()
                .any(|&rp| is_in_jump_lane(from, landing, rp));
            if blocked {
                score += 300;
            } else {
                score -= 150;
            }
        }
    }

    score
}

fn mobility_score(board: &Board, color: Color) -> i32 {
    use crate::rules::all_valid_moves;
    let own = all_valid_moves(board, color).len() as i32;
    let opp = all_valid_moves(board, color.opponent()).len() as i32;
    (own - opp) * 8
}

pub fn evaluate_board(board: &Board, ai_color: Color) -> i32 {
    let human_color = ai_color.opponent();

    let mut material = 0i32;
    let mut pst_score = 0i32;

    for piece in board.pieces.iter().flatten() {
        let val = piece.piece_type.base_value();
        let pst = pst_value(piece);
        if piece.color == ai_color {
            material += val;
            pst_score += pst;
        } else {
            material -= val;
            pst_score -= pst;
        }
    }

    let counter = counter_bonus(board, ai_color) - counter_bonus(board, human_color);
    let trap = trap_control_score(board, ai_color) - trap_control_score(board, human_color);
    let den_prox = den_proximity_score(board, ai_color);
    let shield = den_shield_score(board, ai_color) - den_shield_score(board, human_color);
    let hunt = rat_hunt_score(board, ai_color) - rat_hunt_score(board, human_color);
    let block =
        rat_river_block_score(board, ai_color) - rat_river_block_score(board, human_color);

    let mobility = mobility_score(board, ai_color);

    material + pst_score + counter + trap + den_prox + shield + hunt + block + mobility
}

fn is_guard_square(pos: Pos, color: Color) -> bool {
    let den = own_den(color);
    manhattan(pos, den) <= 2
}

fn is_adjacent_to_den(pos: Pos, den: Pos) -> bool {
    manhattan(pos, den) == 1
}

fn is_on_path(from: Pos, to: Pos, pos: Pos) -> bool {
    if pos.row == from.row && pos.col == from.col {
        return true;
    }
    let dr = to.row as i16 - from.row as i16;
    let dc = to.col as i16 - from.col as i16;
    let sr: i16 = if dr == 0 { 0 } else if dr > 0 { 1 } else { -1 };
    let sc: i16 = if dc == 0 { 0 } else if dc > 0 { 1 } else { -1 };
    let mut r = from.row as i16;
    let mut c = from.col as i16;
    let tr = to.row as i16;
    let tc = to.col as i16;
    while r != tr || c != tc {
        if r != from.row as i16 || c != from.col as i16 {
            if pos.row as i16 == r && pos.col as i16 == c {
                return true;
            }
        }
        if (tr - r).abs() >= (tc - c).abs() {
            r += sr;
        } else {
            c += sc;
        }
    }
    false
}

pub fn move_order_score(mv: &Move, board: &Board, ai_color: Color) -> i32 {
    let mut score = 0i32;
    let human_den = opponent_den(ai_color);
    let ai_den = own_den(ai_color);

    if mv.to.row == human_den.row && mv.to.col == human_den.col {
        return 100000;
    }

    let own_count = board
        .pieces
        .iter()
        .filter(|p| p.as_ref().map_or(false, |p| p.color == ai_color))
        .count() as i32;
    let opp_count = board
        .pieces
        .iter()
        .filter(|p| p.as_ref().map_or(false, |p| p.color != ai_color))
        .count() as i32;

    if mv.is_capture {
        if let Some(captured) = board.pieces[mv.captured_idx as usize].as_ref() {
            score += 10000 + captured.piece_type.base_value();
            if own_count > opp_count {
                score += 400;
            } else if own_count < opp_count {
                score -= 200;
            }
        }
    }

    let opp_trap_fn = match ai_color {
        Color::Dark => is_light_trap,
        Color::Light => is_dark_trap,
    };
    if opp_trap_fn(mv.to) {
        score += 5000;
    }

    let piece = match board.pieces[mv.piece_idx as usize].as_ref() {
        Some(p) => p,
        None => return score,
    };

    if piece.piece_type == PieceType::Rat {
        let enemy_elephant = board.pieces.iter().find(|p| {
            p.as_ref().map_or(false, |p| {
                p.piece_type == PieceType::Elephant && p.color != piece.color
            })
        });
        if let Some(Some(ele)) = enemy_elephant {
            let dist_before = manhattan(piece.pos, ele.pos);
            let dist_after = manhattan(mv.to, ele.pos);
            if dist_after < dist_before {
                score += match dist_after {
                    0..=1 => 9000,
                    2 => 5000,
                    3 => 3000,
                    4 => 1500,
                    _ => 0,
                };
            }
            if is_river(mv.to) && !is_river(piece.pos) {
                score += 2000;
            }
        }
    }

    if (piece.piece_type == PieceType::Lion || piece.piece_type == PieceType::Tiger)
        && !is_river(piece.pos)
        && !is_river(mv.to)
    {
        let dist_before_den = manhattan(piece.pos, human_den);
        let dist_after_den = manhattan(mv.to, human_den);
        if dist_after_den < dist_before_den {
            score += 2500;
        }
    }

    let enemy_pieces: Vec<&Piece> = board
        .pieces
        .iter()
        .filter_map(|p| p.as_ref().filter(|p| p.color != ai_color))
        .collect();

    let mut min_ttd = 99i32;
    let mut threat_pos: Option<Pos> = None;

    for t in enemy_pieces.iter() {
        let ttd = manhattan(t.pos, ai_den);
        if ttd < min_ttd {
            min_ttd = ttd;
            threat_pos = Some(t.pos);
        }
    }

    if mv.is_capture {
        if let Some(tp) = threat_pos {
            if let Some(captured) = board.pieces[mv.captured_idx as usize].as_ref() {
                if captured.pos == tp {
                    score += 25000;
                }
            }
        }
    }

    let own_pieces: Vec<&Piece> = board
        .pieces
        .iter()
        .filter_map(|p| p.as_ref().filter(|p| p.color == ai_color))
        .collect();
    let best_ttg = own_pieces
        .iter()
        .map(|p| manhattan(p.pos, ai_den))
        .min()
        .unwrap_or(99);

    if min_ttd <= 8 || best_ttg <= 3 || manhattan(piece.pos, ai_den) <= 3 {
        let gap = min_ttd - best_ttg;

        let from_is_guard = is_guard_square(piece.pos, ai_color);
        let to_is_guard = is_guard_square(mv.to, ai_color);

        if from_is_guard && !to_is_guard && gap <= 2 {
            score -= 15000;
        }

        if is_adjacent_to_den(mv.to, ai_den) && !is_adjacent_to_den(piece.pos, ai_den) {
            score += 15000;
        }

        if to_is_guard && !from_is_guard {
            score += 10000;
        }

        if let Some(tp) = threat_pos {
            let other_own: Vec<Pos> = own_pieces
                .iter()
                .filter(|p| p.pos != piece.pos)
                .map(|p| p.pos)
                .collect();

            let blocked_before = other_own
                .iter()
                .chain(std::iter::once(&piece.pos))
                .any(|&op| is_on_path(tp, ai_den, op));
            let blocked_after = other_own
                .iter()
                .chain(std::iter::once(&mv.to))
                .any(|&op| is_on_path(tp, ai_den, op));

            if blocked_before && !blocked_after {
                score -= 12000;
            }
            if !blocked_before && blocked_after {
                score += 8000;
            }
        }
    }

    let dist_before = manhattan(piece.pos, human_den);
    let dist_after = manhattan(mv.to, human_den);
    if dist_after < dist_before {
        let base = (dist_before - dist_after) * 50 * piece.piece_type.rank() as i32;
        if manhattan(piece.pos, ai_den) <= 3 && manhattan(mv.to, ai_den) > 3 {
            score += base / 3;
        } else {
            score += base;
        }
    }

    if is_river(mv.to) && piece.piece_type != PieceType::Rat {
        score -= 1000;
    }

    score
}
