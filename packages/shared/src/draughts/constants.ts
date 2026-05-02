export const DIAGONAL_DIRS = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
] as const;

export const FORWARD_DIRS_DARK = [
  { dr: 1, dc: -1 },
  { dr: 1, dc: 1 },
] as const;

export const FORWARD_DIRS_LIGHT = [
  { dr: -1, dc: -1 },
  { dr: -1, dc: 1 },
] as const;
