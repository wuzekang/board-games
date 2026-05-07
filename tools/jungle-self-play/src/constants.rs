use crate::types::{Color, Pos};

pub const ROWS: u8 = 9;
pub const COLS: u8 = 7;

pub const RIVER_MASK: u64 = {
    let mut m = 0u64;
    let mut r = 3u8;
    while r <= 5 {
        let mut c = 1u8;
        while c <= 5 {
            if c != 3 {
                m |= 1u64 << ((r as usize) * 7 + (c as usize));
            }
            c += 1;
        }
        r += 1;
    }
    m
};

#[inline]
pub fn is_river(pos: Pos) -> bool {
    pos.idx() < 63 && (RIVER_MASK >> pos.idx()) & 1 == 1
}

pub const DARK_TRAP_MASK: u64 =
    (1u64 << (8 * 7 + 2)) | (1u64 << (8 * 7 + 4)) | (1u64 << (7 * 7 + 3));

pub const LIGHT_TRAP_MASK: u64 =
    (1u64 << (0 * 7 + 2)) | (1u64 << (0 * 7 + 4)) | (1u64 << (1 * 7 + 3));

#[inline]
pub fn is_dark_trap(pos: Pos) -> bool {
    pos.idx() < 63 && (DARK_TRAP_MASK >> pos.idx()) & 1 == 1
}

#[inline]
pub fn is_light_trap(pos: Pos) -> bool {
    pos.idx() < 63 && (LIGHT_TRAP_MASK >> pos.idx()) & 1 == 1
}

pub const DARK_DEN: Pos = Pos::new(8, 3);
pub const LIGHT_DEN: Pos = Pos::new(0, 3);

#[inline]
pub fn own_den(color: Color) -> Pos {
    match color {
        Color::Dark => DARK_DEN,
        Color::Light => LIGHT_DEN,
    }
}

#[inline]
pub fn opponent_den(color: Color) -> Pos {
    match color {
        Color::Dark => LIGHT_DEN,
        Color::Light => DARK_DEN,
    }
}

#[inline]
pub fn is_own_den(pos: Pos, color: Color) -> bool {
    let den = own_den(color);
    pos.row == den.row && pos.col == den.col
}

#[inline]
pub fn is_opponent_den(pos: Pos, color: Color) -> bool {
    let den = opponent_den(color);
    pos.row == den.row && pos.col == den.col
}

pub const ORTHO: [(i8, i8); 4] = [(-1, 0), (1, 0), (0, -1), (0, 1)];

#[inline]
pub fn manhattan(a: Pos, b: Pos) -> i32 {
    (a.row as i32 - b.row as i32).abs() + (a.col as i32 - b.col as i32).abs()
}
