import { InferenceSession, Tensor } from 'onnxruntime-node';
import type { PieceColor } from '@board-games/shared';
import {
  type JungleBoardState,
  type JungleMove,
} from '@board-games/shared/jungle';
import { getAllJungleValidMoves } from '@board-games/shared/jungle';
import { encodeJungleBoard, moveIndex, MAX_MOVE_IDX } from './encoding';

const MODEL_PATH = 'models/jungle_net.onnx';

let globalSession: InferenceSession | null = null;
let sessionLoading: Promise<InferenceSession> | null = null;

async function getSession(): Promise<InferenceSession> {
  if (globalSession) return globalSession;
  if (sessionLoading) return sessionLoading;

  sessionLoading = InferenceSession.create(MODEL_PATH, {
    executionProviders: ['cpu'],
    graphOptimizationLevel: 'all',
  });

  try {
    globalSession = await sessionLoading;
    return globalSession;
  } catch (err) {
    sessionLoading = null;
    throw err;
  }
}

export async function warmUp(): Promise<void> {
  await getSession();
}

function softmax(logits: Float32Array): Float32Array {
  const max = Math.max(...logits);
  const exps = new Float32Array(logits.length);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    exps[i] = Math.exp(logits[i] - max);
    sum += exps[i];
  }
  const probs = new Float32Array(logits.length);
  for (let i = 0; i < logits.length; i++) {
    probs[i] = exps[i] / sum;
  }
  return probs;
}

function fallbackPick(moves: JungleMove[]): JungleMove {
  return moves[Math.floor(Math.random() * moves.length)];
}

export async function getNeuralMove(
  board: JungleBoardState,
  aiColor: PieceColor,
  difficulty: string,
): Promise<JungleMove | null> {
  const moves = getAllJungleValidMoves(board, aiColor);
  if (moves.length === 0) return null;
  if (moves.length === 1) return moves[0];

  let session: InferenceSession;
  try {
    session = await getSession();
  } catch {
    return fallbackPick(moves);
  }

  try {
    const encoded = encodeJungleBoard(board);
    const inputTensor = new Tensor('float32', encoded, [1, 20, 9, 7]);

    const results = await session.run(
      { [session.inputNames[0]]: inputTensor },
      session.outputNames,
    );

    const policyKey = session.outputNames[0];
    const policyLogits = results[policyKey].data as Float32Array;

    const probs = softmax(policyLogits);

    const moveProbs: number[] = [];
    const validMoves: JungleMove[] = [];

    for (const move of moves) {
      const idx = moveIndex(move.from, move.to);
      if (idx >= 0 && idx < MAX_MOVE_IDX) {
        moveProbs.push(probs[idx]);
        validMoves.push(move);
      }
    }

    if (validMoves.length === 0) return fallbackPick(moves);

    switch (difficulty) {
      case 'easy': {
        const totalProb = moveProbs.reduce((a, b) => a + b, 0);
        if (totalProb === 0) return fallbackPick(validMoves);
        let r = Math.random() * totalProb;
        for (let i = 0; i < validMoves.length; i++) {
          r -= moveProbs[i];
          if (r <= 0) return validMoves[i];
        }
        return validMoves[validMoves.length - 1];
      }
      case 'medium': {
        const topK = Math.min(3, validMoves.length);
        const sorted = validMoves
          .map((m, i) => ({ move: m, prob: moveProbs[i] }))
          .sort((a, b) => b.prob - a.prob)
          .slice(0, topK);
        const totalTopProb = sorted.reduce((a, b) => a + b.prob, 0);
        let r = Math.random() * totalTopProb;
        for (const entry of sorted) {
          r -= entry.prob;
          if (r <= 0) return entry.move;
        }
        return sorted[sorted.length - 1].move;
      }
      default: {
        let bestIdx = 0;
        let bestProb = moveProbs[0];
        for (let i = 1; i < validMoves.length; i++) {
          if (moveProbs[i] > bestProb) {
            bestProb = moveProbs[i];
            bestIdx = i;
          }
        }
        return validMoves[bestIdx];
      }
    }
  } catch {
    return fallbackPick(moves);
  }
}
