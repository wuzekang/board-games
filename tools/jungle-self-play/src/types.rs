use std::fmt;

#[derive(Clone, Copy, PartialEq, Eq, Debug, Hash)]
pub enum Color {
    Dark = 0,
    Light = 1,
}

impl Color {
    #[inline]
    pub fn opponent(self) -> Self {
        match self {
            Color::Dark => Color::Light,
            Color::Light => Color::Dark,
        }
    }

    #[inline]
    pub fn as_u8(self) -> u8 {
        self as u8
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug, Hash)]
#[repr(u8)]
pub enum PieceType {
    Elephant = 0,
    Lion = 1,
    Tiger = 2,
    Leopard = 3,
    Dog = 4,
    Wolf = 5,
    Cat = 6,
    Rat = 7,
}

impl PieceType {
    #[inline]
    pub fn rank(self) -> u8 {
        [8, 7, 6, 5, 4, 3, 2, 1][self as usize]
    }

    #[inline]
    pub fn base_value(self) -> i32 {
        [800, 700, 600, 500, 400, 300, 200, 250][self as usize]
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Pos {
    pub row: u8,
    pub col: u8,
}

impl Pos {
    #[inline]
    pub const fn new(row: u8, col: u8) -> Self {
        Pos { row, col }
    }

    #[inline]
    pub fn idx(self) -> usize {
        self.row as usize * 7 + self.col as usize
    }

    #[inline]
    pub fn in_bounds(self) -> bool {
        self.row < 9 && self.col < 7
    }

    #[inline]
    pub fn manhattan(self, other: Pos) -> i32 {
        (self.row as i32 - other.row as i32).abs() + (self.col as i32 - other.col as i32).abs()
    }

    #[inline]
    pub fn offset(self, dr: i8, dc: i8) -> Pos {
        Pos {
            row: (self.row as i16 + dr as i16).max(0).min(255) as u8,
            col: (self.col as i16 + dc as i16).max(0).min(255) as u8,
        }
    }
}

impl fmt::Display for Pos {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "({},{})", self.row, self.col)
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Piece {
    pub piece_type: PieceType,
    pub color: Color,
    pub pos: Pos,
}

#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub struct Move {
    pub piece_idx: u8,
    pub from: Pos,
    pub to: Pos,
    pub is_capture: bool,
    pub captured_idx: u8,
}

impl Move {
    #[inline]
    pub fn move_idx(self) -> u16 {
        self.from.idx() as u16 * 63 + self.to.idx() as u16
    }
}

pub const EMPTY: u8 = 255;

#[derive(Clone, Debug)]
pub struct Board {
    pub pieces: [Option<Piece>; 16],
    pub grid: [u8; 63],
    pub next_color: Color,
    pub half_move_clock: u16,
    pub hash: u64,
}

impl Board {
    #[inline]
    pub fn piece_at(&self, pos: Pos) -> Option<&Piece> {
        let idx = self.grid[pos.idx()];
        if idx == EMPTY {
            None
        } else {
            self.pieces[idx as usize].as_ref()
        }
    }

    #[inline]
    pub fn piece_idx_at(&self, pos: Pos) -> u8 {
        self.grid[pos.idx()]
    }

    pub fn piece_count(&self, color: Color) -> usize {
        self.pieces
            .iter()
            .filter(|p| p.as_ref().map_or(false, |p| p.color == color))
            .count()
    }
}

impl Default for Board {
    fn default() -> Self {
        Self::new()
    }
}

impl Board {
    pub fn flipped(&self) -> Self {
        let mut board = Board {
            pieces: [None; 16],
            grid: [EMPTY; 63],
            next_color: self.next_color,
            half_move_clock: self.half_move_clock,
            hash: 0,
        };
        for (i, piece_opt) in self.pieces.iter().enumerate() {
            if let Some(p) = piece_opt {
                let flipped_pos = Pos::new(8 - p.pos.row, p.pos.col);
                let flipped_color = p.color.opponent();
                let flipped_piece = Piece {
                    piece_type: p.piece_type,
                    color: flipped_color,
                    pos: flipped_pos,
                };
                let target_idx = if p.color == Color::Dark { i - 8 } else { i + 8 };
                board.pieces[target_idx] = Some(flipped_piece);
                board.grid[flipped_pos.idx()] = target_idx as u8;
            }
        }
        board
    }

    pub fn new() -> Self {
        let mut board = Board {
            pieces: [None; 16],
            grid: [EMPTY; 63],
            next_color: Color::Dark,
            half_move_clock: 0,
            hash: 0,
        };

        let light_init: [(PieceType, u8, u8); 8] = [
            (PieceType::Tiger, 0, 0),
            (PieceType::Lion, 0, 6),
            (PieceType::Cat, 1, 1),
            (PieceType::Dog, 1, 5),
            (PieceType::Wolf, 2, 0),
            (PieceType::Leopard, 2, 2),
            (PieceType::Rat, 2, 4),
            (PieceType::Elephant, 2, 6),
        ];

        for (i, (pt, row, col)) in light_init.iter().enumerate() {
            let pos = Pos::new(*row, *col);
            board.pieces[i] = Some(Piece {
                piece_type: *pt,
                color: Color::Light,
                pos,
            });
            board.grid[pos.idx()] = i as u8;
        }

        let dark_init: [(PieceType, u8, u8); 8] = [
            (PieceType::Elephant, 6, 0),
            (PieceType::Leopard, 6, 2),
            (PieceType::Wolf, 6, 4),
            (PieceType::Rat, 6, 6),
            (PieceType::Dog, 7, 1),
            (PieceType::Cat, 7, 5),
            (PieceType::Lion, 8, 0),
            (PieceType::Tiger, 8, 6),
        ];

        for (i, (pt, row, col)) in dark_init.iter().enumerate() {
            let piece_idx = i + 8;
            let pos = Pos::new(*row, *col);
            board.pieces[piece_idx] = Some(Piece {
                piece_type: *pt,
                color: Color::Dark,
                pos,
            });
            board.grid[pos.idx()] = piece_idx as u8;
        }

        board
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum GameResult {
    Winner(Color),
    Draw,
}
