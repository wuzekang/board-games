use wasm_bindgen::prelude::*;
use crate::types::{Board, Color, Move, Piece, PieceType, Pos, EMPTY};
use crate::self_play::{get_heuristic, minimax_root_wasm};

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct TsBoardState {
    pieces: Vec<TsPiece>,
    next_color: String,
    half_move_clock: u16,
}

#[derive(serde::Deserialize)]
struct TsPiece {
    id: String,
    #[serde(rename = "type")]
    piece_type: String,
    color: String,
    position: TsPos,
}

#[derive(serde::Deserialize, serde::Serialize)]
struct TsPos {
    row: u8,
    col: u8,
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct TsMove {
    piece_id: String,
    from: TsPos,
    to: TsPos,
    #[serde(rename = "type")]
    move_type: String,
    captured_piece_id: Option<String>,
}

fn parse_color(s: &str) -> Option<Color> {
    match s {
        "dark" => Some(Color::Dark),
        "light" => Some(Color::Light),
        _ => None,
    }
}

fn parse_piece_type(s: &str) -> Option<PieceType> {
    match s {
        "elephant" => Some(PieceType::Elephant),
        "lion" => Some(PieceType::Lion),
        "tiger" => Some(PieceType::Tiger),
        "leopard" => Some(PieceType::Leopard),
        "dog" => Some(PieceType::Dog),
        "wolf" => Some(PieceType::Wolf),
        "cat" => Some(PieceType::Cat),
        "rat" => Some(PieceType::Rat),
        _ => None,
    }
}

fn ts_board_to_rust(ts: &TsBoardState) -> Option<Board> {
    let mut board = Board {
        pieces: [None; 16],
        grid: [EMPTY; 63],
        next_color: parse_color(&ts.next_color)?,
        half_move_clock: ts.half_move_clock,
    };

    for p in &ts.pieces {
        let idx: usize = p.id.strip_prefix("jl")?.parse::<usize>().ok()? - 1;
        if idx >= 16 {
            return None;
        }
        let piece_type = parse_piece_type(&p.piece_type)?;
        let color = parse_color(&p.color)?;
        let pos = Pos::new(p.position.row, p.position.col);
        if pos.idx() >= 63 {
            return None;
        }

        board.pieces[idx] = Some(Piece {
            piece_type,
            color,
            pos,
        });
        board.grid[pos.idx()] = idx as u8;
    }

    Some(board)
}

fn rust_move_to_ts(mv: &Move) -> TsMove {
    TsMove {
        piece_id: format!("jl{}", mv.piece_idx + 1),
        from: TsPos {
            row: mv.from.row,
            col: mv.from.col,
        },
        to: TsPos {
            row: mv.to.row,
            col: mv.to.col,
        },
        move_type: if mv.is_capture {
            "capture".into()
        } else {
            "normal".into()
        },
        captured_piece_id: if mv.is_capture {
            Some(format!("jl{}", mv.captured_idx + 1))
        } else {
            None
        },
    }
}

#[wasm_bindgen]
pub fn get_best_move(board_json: &str, ai_color: &str, depth: u32) -> Option<String> {
    #[cfg(feature = "wasm")]
    console_error_panic_hook::set_once();

    let ts_board: TsBoardState = serde_json::from_str(board_json).ok()?;
    let board = ts_board_to_rust(&ts_board)?;
    let color = parse_color(ai_color)?;

    let best_move = minimax_root_wasm(&board, color, depth as i32)?;
    let ts_move = rust_move_to_ts(&best_move);
    serde_json::to_string(&ts_move).ok()
}
