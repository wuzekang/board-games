pub mod constants;
pub mod types;
pub mod rules;
pub mod heuristic;
pub mod heuristic_v1;
pub mod heuristic_v2;
pub mod heuristic_v3;
pub mod heuristic_v4;
pub mod heuristic_v5;
pub mod heuristic_v6;
pub mod self_play;

#[cfg(feature = "neural")]
pub mod encoding;
#[cfg(feature = "neural")]
pub mod mcts;
#[cfg(feature = "neural")]
pub mod neural;

#[cfg(feature = "wasm")]
pub mod wasm_api;
