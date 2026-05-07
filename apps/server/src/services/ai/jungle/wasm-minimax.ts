import type { JungleBoardState, JungleMove } from '@board-games/shared/jungle';
import type { PieceColor } from '@board-games/shared';
import { createRequire } from 'module';

const DEPTH: Record<string, number> = { easy: 1, medium: 2, hard: 3 };

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

export function warmUpWasm(): void {
  ensureWasm().catch(() => {});
}

export async function getWasmMove(
  board: JungleBoardState,
  aiColor: PieceColor,
  difficulty: string,
): Promise<JungleMove | null> {
  await ensureWasm();
  if (!wasm) return null;
  try {
    const json = wasm.get_best_move(
      JSON.stringify(board),
      aiColor.toLowerCase(),
      DEPTH[difficulty] ?? 3,
    );
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error('[jungle-wasm] get_best_move error:', err);
    return null;
  }
}
