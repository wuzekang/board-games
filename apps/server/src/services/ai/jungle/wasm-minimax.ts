import type { JungleBoardState, JungleMove } from '@board-games/shared/jungle';
import type { PieceColor } from '@board-games/shared';
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';

const TIME_MS: Record<string, number> = { easy: 500, medium: 1000, hard: 2000 };

let wasm: { get_best_move(board_json: string, ai_color: string, time_ms: number): string | undefined; new_game(): void } | null = null;
let loadAttempted = false;

function resolveWasmPath(): string {
  const candidates = [
    path.resolve(import.meta.dirname, 'wasm-pkg'),
    path.resolve(import.meta.dirname, '../../src/services/ai/jungle/wasm-pkg'),
    path.resolve(process.cwd(), 'wasm-pkg'),
  ];
  for (const dir of candidates) {
    const jsPath = path.join(dir, 'jungle_wasm.js');
    if (fs.existsSync(jsPath)) return jsPath;
  }
  throw new Error('wasm-pkg/jungle_wasm.js not found in any candidate path');
}

async function ensureWasm(): Promise<void> {
  if (loadAttempted) return;
  loadAttempted = true;
  try {
    const jsPath = resolveWasmPath();
    const require = createRequire(jsPath);
    wasm = require(jsPath);
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
      TIME_MS[difficulty] ?? 2000,
    );
    return json ? JSON.parse(json) : null;
  } catch (err) {
    console.error('[jungle-wasm] get_best_move error:', err);
    return null;
  }
}
