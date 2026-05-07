use crate::constants::{is_dark_trap, is_light_trap};
use crate::types::{Board, Color, Pos};

const CHANNELS: usize = 20;
const CELLS: usize = 9 * 7;

pub fn encode_board(board: &Board) -> Vec<f32> {
    let mut channels = vec![0.0f32; CHANNELS * CELLS];

    let idx = |ch: usize, pos: Pos| ch * CELLS + pos.idx();

    for piece in board.pieces.iter().flatten() {
        let ch = piece.piece_type as usize + if piece.color == Color::Dark { 0 } else { 8 };
        channels[idx(ch, piece.pos)] = 1.0;
    }

    let turn_val = if board.next_color == Color::Dark { 1.0 } else { 0.0 };
    for i in 0..CELLS {
        channels[16 * CELLS + i] = turn_val;
    }

    for row in 3u8..=5 {
        for &col in &[1u8, 2, 4, 5] {
            channels[idx(17, Pos::new(row, col))] = 1.0;
        }
    }

    let trap_mask = match board.next_color {
        Color::Dark => is_dark_trap,
        Color::Light => is_light_trap,
    };
    for sq in 0..63u8 {
        if trap_mask(Pos::new(sq / 7, sq % 7)) {
            channels[18 * CELLS + sq as usize] = 1.0;
        }
    }

    let clock_val = board.half_move_clock.min(100) as f32 / 100.0;
    for i in 0..CELLS {
        channels[19 * CELLS + i] = clock_val;
    }

    channels
}
