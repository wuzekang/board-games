use crate::constants::{
    is_dark_trap, is_light_trap, is_opponent_den, is_own_den, is_river, ORTHO, COLS,
    ROWS,
};
use crate::types::{Board, Color, GameResult, Move, Piece, PieceType, Pos, EMPTY};
use smallvec::SmallVec;

#[inline]
fn in_bounds(pos: Pos) -> bool {
    pos.row < ROWS && pos.col < COLS
}

fn can_capture(
    attacker: &Piece,
    defender: &Piece,
    attacker_in_river: bool,
    defender_in_river: bool,
) -> bool {
    if attacker.color == defender.color {
        return false;
    }
    if attacker_in_river != defender_in_river {
        return false;
    }

    let mut attacker_rank = attacker.piece_type.rank();
    let mut defender_rank = defender.piece_type.rank();

    if is_trap_for_opponent(defender.pos, attacker.color) {
        defender_rank = 0;
    }
    if is_trap_for_opponent(attacker.pos, defender.color) {
        attacker_rank = 0;
    }

    if attacker_rank == 0 && defender_rank == 0 {
        return true;
    }

    if attacker.piece_type == PieceType::Rat && defender.piece_type == PieceType::Elephant {
        return !attacker_in_river;
    }
    if attacker.piece_type == PieceType::Elephant && defender.piece_type == PieceType::Rat {
        return false;
    }

    attacker_rank >= defender_rank
}

#[inline]
fn is_trap_for_opponent(pos: Pos, attacker_color: Color) -> bool {
    match attacker_color {
        Color::Dark => is_light_trap(pos),
        Color::Light => is_dark_trap(pos),
    }
}

fn lion_tiger_jumps(board: &Board, piece: &Piece, piece_idx: u8) -> SmallVec<[Move; 4]> {
    let mut moves = SmallVec::new();

    for &(dr, dc) in &ORTHO {
        let nr = piece.pos.row as i16 + dr as i16;
        let nc = piece.pos.col as i16 + dc as i16;

        if nr < 0 || nr >= ROWS as i16 || nc < 0 || nc >= COLS as i16 {
            continue;
        }
        if !is_river(Pos::new(nr as u8, nc as u8)) {
            continue;
        }

        let mut r = nr;
        let mut c = nc;
        let mut blocked = false;

        while r >= 0 && r < ROWS as i16 && c >= 0 && c < COLS as i16 {
            let rp = Pos::new(r as u8, c as u8);
            if !is_river(rp) {
                break;
            }
            if let Some(occ) = board.piece_at(rp) {
                if occ.piece_type == PieceType::Rat {
                    blocked = true;
                    break;
                }
            }
            r += dr as i16;
            c += dc as i16;
        }

        if blocked || r < 0 || r >= ROWS as i16 || c < 0 || c >= COLS as i16 {
            continue;
        }

        let landing = Pos::new(r as u8, c as u8);

        if is_own_den(landing, piece.color) {
            continue;
        }

        let target_idx = board.piece_idx_at(landing);
        if target_idx != EMPTY {
            if let Some(target) = board.piece_at(landing) {
                if target.color != piece.color {
                    let defender_in_river = is_river(target.pos);
                    if can_capture(piece, target, false, defender_in_river) {
                        moves.push(Move {
                            piece_idx,
                            from: piece.pos,
                            to: landing,
                            is_capture: true,
                            captured_idx: target_idx,
                        });
                    }
                }
            }
        } else {
            moves.push(Move {
                piece_idx,
                from: piece.pos,
                to: landing,
                is_capture: false,
                captured_idx: EMPTY,
            });
        }
    }

    moves
}

pub fn valid_moves_for_piece(board: &Board, piece_idx: u8, color: Color) -> SmallVec<[Move; 16]> {
    let mut moves = SmallVec::new();

    let piece = match board.pieces[piece_idx as usize] {
        Some(ref p) if p.color == color => p,
        _ => return moves,
    };

    let attacker_in_river = is_river(piece.pos);

    if piece.piece_type == PieceType::Lion || piece.piece_type == PieceType::Tiger {
        moves.extend(lion_tiger_jumps(board, piece, piece_idx));
    }

    for &(dr, dc) in &ORTHO {
        let to_r = piece.pos.row as i16 + dr as i16;
        let to_c = piece.pos.col as i16 + dc as i16;

        if to_r < 0 || to_r >= ROWS as i16 || to_c < 0 || to_c >= COLS as i16 {
            continue;
        }
        let to = Pos::new(to_r as u8, to_c as u8);

        if is_own_den(to, piece.color) {
            continue;
        }

        if !attacker_in_river && is_river(to) {
            if piece.piece_type == PieceType::Rat {
                let target_idx = board.piece_idx_at(to);
                if target_idx != EMPTY {
                    if let Some(target) = board.piece_at(to) {
                        if target.piece_type == PieceType::Rat && target.color != piece.color {
                            moves.push(Move {
                                piece_idx,
                                from: piece.pos,
                                to,
                                is_capture: true,
                                captured_idx: target_idx,
                            });
                        }
                    }
                } else {
                    moves.push(Move {
                        piece_idx,
                        from: piece.pos,
                        to,
                        is_capture: false,
                        captured_idx: EMPTY,
                    });
                }
            }
            continue;
        }

        if attacker_in_river && !is_river(to) {
            let target_idx = board.piece_idx_at(to);
            if target_idx != EMPTY {
                if let Some(target) = board.piece_at(to) {
                    if target.color != piece.color && target.piece_type == PieceType::Rat {
                        moves.push(Move {
                            piece_idx,
                            from: piece.pos,
                            to,
                            is_capture: true,
                            captured_idx: target_idx,
                        });
                    }
                }
            } else {
                moves.push(Move {
                    piece_idx,
                    from: piece.pos,
                    to,
                    is_capture: false,
                    captured_idx: EMPTY,
                });
            }
            continue;
        }

        if attacker_in_river && is_river(to) {
            if piece.piece_type != PieceType::Rat {
                continue;
            }
            let target_idx = board.piece_idx_at(to);
            if target_idx != EMPTY {
                if let Some(target) = board.piece_at(to) {
                    if target.piece_type == PieceType::Rat && target.color != piece.color {
                        moves.push(Move {
                            piece_idx,
                            from: piece.pos,
                            to,
                            is_capture: true,
                            captured_idx: target_idx,
                        });
                    }
                }
            } else {
                moves.push(Move {
                    piece_idx,
                    from: piece.pos,
                    to,
                    is_capture: false,
                    captured_idx: EMPTY,
                });
            }
            continue;
        }

        let target_idx = board.piece_idx_at(to);
        if target_idx != EMPTY {
            if let Some(target) = board.piece_at(to) {
                if can_capture(piece, target, attacker_in_river, is_river(target.pos)) {
                    moves.push(Move {
                        piece_idx,
                        from: piece.pos,
                        to,
                        is_capture: true,
                        captured_idx: target_idx,
                    });
                }
            }
        } else {
            moves.push(Move {
                piece_idx,
                from: piece.pos,
                to,
                is_capture: false,
                captured_idx: EMPTY,
            });
        }
    }

    moves
}

pub fn all_valid_moves(board: &Board, color: Color) -> SmallVec<[Move; 64]> {
    let mut moves = SmallVec::new();
    for (idx, piece) in board.pieces.iter().enumerate() {
        if let Some(p) = piece {
            if p.color == color {
                moves.extend(valid_moves_for_piece(board, idx as u8, color));
            }
        }
    }
    moves
}

pub fn apply_move(board: &Board, mv: Move) -> Board {
    let mut new = board.clone();
    let mut h = board.hash;

    h ^= crate::self_play::ZOBRIST_PIECES[mv.from.idx()][mv.piece_idx as usize];

    new.grid[mv.from.idx()] = EMPTY;

    if mv.is_capture {
        if let Some(ref _p) = new.pieces[mv.captured_idx as usize] {
            h ^= crate::self_play::ZOBRIST_PIECES[mv.to.idx()][mv.captured_idx as usize];
            new.grid[mv.to.idx()] = EMPTY;
        }
        new.pieces[mv.captured_idx as usize] = None;
        new.half_move_clock = 0;
    } else {
        new.half_move_clock += 1;
    }

    h ^= crate::self_play::ZOBRIST_PIECES[mv.to.idx()][mv.piece_idx as usize];
    h ^= crate::self_play::ZOBRIST_COLOR;

    if let Some(ref mut p) = new.pieces[mv.piece_idx as usize] {
        p.pos = mv.to;
    }
    new.grid[mv.to.idx()] = mv.piece_idx;

    new.next_color = new.next_color.opponent();
    new.hash = h;

    new
}

pub fn get_game_result(board: &Board, current_color: Color) -> Option<GameResult> {
    let opponent = current_color.opponent();

    for piece in board.pieces.iter().flatten() {
        if is_opponent_den(piece.pos, piece.color) {
            return Some(GameResult::Winner(piece.color));
        }
    }

    if board.piece_count(Color::Dark) == 0 {
        return Some(GameResult::Winner(Color::Light));
    }
    if board.piece_count(Color::Light) == 0 {
        return Some(GameResult::Winner(Color::Dark));
    }

    let current_moves = all_valid_moves(board, current_color);
    if current_moves.is_empty() {
        return Some(GameResult::Winner(opponent));
    }

    let opponent_moves = all_valid_moves(board, opponent);
    if opponent_moves.is_empty() {
        return Some(GameResult::Winner(current_color));
    }

    if board.half_move_clock >= 300 {
        return Some(GameResult::Draw);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_initial_board_dark_moves() {
        let board = Board::new();
        let moves = all_valid_moves(&board, Color::Dark);
        assert!(!moves.is_empty(), "Dark should have valid moves initially");
    }

    #[test]
    fn test_initial_board_piece_count() {
        let board = Board::new();
        assert_eq!(board.piece_count(Color::Dark), 8);
        assert_eq!(board.piece_count(Color::Light), 8);
    }

    #[test]
    fn test_river_detection() {
        assert!(is_river(Pos::new(3, 1)));
        assert!(is_river(Pos::new(5, 5)));
        assert!(!is_river(Pos::new(3, 3)));
        assert!(!is_river(Pos::new(0, 0)));
    }

    #[test]
    fn test_den_detection() {
        assert!(is_own_den(Pos::new(8, 3), Color::Dark));
        assert!(is_own_den(Pos::new(0, 3), Color::Light));
        assert!(!is_own_den(Pos::new(8, 3), Color::Light));
    }

    #[test]
    fn test_rat_cannot_capture_elephant_from_river() {
        let mut board = Board::new();
        board.pieces = [None; 16];
        board.grid = [EMPTY; 63];

        let rat = Piece { piece_type: PieceType::Rat, color: Color::Dark, pos: Pos::new(3, 1) };
        board.pieces[0] = Some(rat);
        board.grid[Pos::new(3, 1).idx()] = 0;

        let elephant = Piece { piece_type: PieceType::Elephant, color: Color::Light, pos: Pos::new(2, 1) };
        board.pieces[1] = Some(elephant);
        board.grid[Pos::new(2, 1).idx()] = 1;

        board.next_color = Color::Dark;

        let moves = valid_moves_for_piece(&board, 0, Color::Dark);
        assert!(moves.iter().all(|m| !(m.is_capture && m.to.row == 2 && m.to.col == 1)),
            "Rat in river cannot capture elephant on land");
    }

    #[test]
    fn test_elephant_cannot_capture_rat() {
        let mut board = Board::new();
        board.pieces = [None; 16];
        board.grid = [EMPTY; 63];

        let elephant = Piece { piece_type: PieceType::Elephant, color: Color::Dark, pos: Pos::new(3, 0) };
        board.pieces[0] = Some(elephant);
        board.grid[Pos::new(3, 0).idx()] = 0;

        let rat = Piece { piece_type: PieceType::Rat, color: Color::Light, pos: Pos::new(2, 0) };
        board.pieces[1] = Some(rat);
        board.grid[Pos::new(2, 0).idx()] = 1;

        board.next_color = Color::Dark;

        let moves = valid_moves_for_piece(&board, 0, Color::Dark);
        assert!(moves.iter().all(|m| !(m.is_capture && m.to.row == 2 && m.to.col == 0)),
            "Elephant cannot capture rat");
    }

    #[test]
    fn test_cannot_enter_own_den() {
        let mut board = Board::new();
        board.pieces = [None; 16];
        board.grid = [EMPTY; 63];

        let rat = Piece { piece_type: PieceType::Rat, color: Color::Dark, pos: Pos::new(7, 3) };
        board.pieces[0] = Some(rat);
        board.grid[Pos::new(7, 3).idx()] = 0;

        board.next_color = Color::Dark;

        let moves = valid_moves_for_piece(&board, 0, Color::Dark);
        assert!(moves.iter().all(|m| !(m.to.row == 8 && m.to.col == 3)),
            "Cannot enter own den");
    }
}
