mod constants;
mod encoding;
mod heuristic;
mod heuristic_v1;
mod heuristic_v2;
mod heuristic_v3;
mod heuristic_v4;
mod heuristic_v5;
mod heuristic_v6;
#[cfg(feature = "neural")]
mod mcts;
#[cfg(feature = "neural")]
mod neural;
mod rules;
mod self_play;
mod types;

use clap::Parser;
use indicatif::{ProgressBar, ProgressStyle};
use rand::rngs::SmallRng;
use rand::SeedableRng;
use rayon::prelude::*;
use self_play::{get_heuristic, play_one_game, play_pk_mm_game, HeuristicFns, PkMmResult, TrainingSample};
#[cfg(feature = "neural")]
use self_play::{play_one_game_neural, play_pk_game, play_pk_mixed_game, PkResult};
use std::fs::File;
use std::io::BufWriter;
use std::sync::Mutex;

#[derive(Parser)]
#[command(name = "jungle-self-play")]
struct Args {
    #[arg(short, long, default_value = "5000")]
    games: usize,

    #[arg(short, long, default_value = "training_data.jsonl")]
    output: String,

    #[arg(short, long, default_value = "0")]
    threads: usize,

    #[arg(long, default_value = "0")]
    seed: u64,

    #[arg(long, default_value = "1.0")]
    temperature: f32,

    #[arg(long, default_value = "minimax")]
    mode: String,

    #[arg(short, long, default_value = "../../apps/server/models/jungle_net.onnx")]
    model: String,

    #[arg(long)]
    model_b: Option<String>,

    #[arg(long, default_value = "50")]
    mcts_iterations: u32,

    #[arg(long, default_value = "10")]
    temperature_moves: usize,

    #[arg(long, default_value_t = 3)]
    pk_depth: i32,

    #[arg(long, default_value_t = 4)]
    random_open: usize,

    #[arg(long, default_value = "v1")]
    heuristic_a: String,

    #[arg(long, default_value = "v1")]
    heuristic_b: String,
}

fn main() {
    let args = Args::parse();

    if args.threads > 0 {
        rayon::ThreadPoolBuilder::new()
            .num_threads(args.threads)
            .build_global()
            .unwrap();
    }

    if args.mode == "pk-mm" {
        run_pk_mm(&args);
        return;
    }

    #[cfg(feature = "neural")]
    {
        if args.mode == "pk" {
            run_pk(&args);
            return;
        }
        if args.mode == "pk-mn" || args.mode == "pk-nm" {
            run_pk_mixed(&args);
            return;
        }
    }

    if args.mode != "minimax" {
        #[cfg(not(feature = "neural"))]
        eprintln!("Warning: mode '{}' requires 'neural' feature. Falling back to minimax.", args.mode);
        #[cfg(feature = "neural")]
        {}
    }

    let h = get_heuristic(&args.heuristic_a);

    let pb = ProgressBar::new(args.games as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template(
                "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} games ({eta})",
            )
            .unwrap(),
    );

    let file = File::create(&args.output).unwrap();
    let writer = Mutex::new(BufWriter::new(file));

    let indices: Vec<usize> = (0..args.games).collect();
    let model_path = args.model.clone();
    let mode = args.mode.clone();
    let mcts_iterations = args.mcts_iterations;
    let temperature_moves = args.temperature_moves;
    let temperature = args.temperature;
    let random_open = args.random_open;

    indices.par_iter().for_each(|&game_idx| {
        #[cfg(feature = "neural")]
        if mode == "neural" {
            neural::init_thread_session(&model_path)
                .expect("Failed to initialize neural session");
        }

        let mut h_seed = if args.seed == 0 {
            (game_idx as u64).wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(0x1234567890ABCDEF)
        } else {
            args.seed
        };
        h_seed ^= game_idx as u64;
        h_seed = h_seed.wrapping_mul(0x517cc1b727220a95);
        h_seed ^= h_seed >> 32;
        h_seed = h_seed.wrapping_mul(0x517cc1b727220a95);
        h_seed ^= h_seed >> 32;
        let seed = h_seed;
        let mut rng = SmallRng::seed_from_u64(seed);

        let (records, game_result) = if mode == "neural" {
            #[cfg(feature = "neural")]
            {
                play_one_game_neural(mcts_iterations, temperature_moves, &mut rng)
            }
            #[cfg(not(feature = "neural"))]
            {
                play_one_game(h, temperature, random_open, game_idx % 2 == 1, &mut rng)
            }
        } else {
            play_one_game(h, temperature, random_open, game_idx % 2 == 1, &mut rng)
        };

        let samples: Vec<TrainingSample> = records
            .iter()
            .map(|rec| TrainingSample::from_record(rec, game_result.clone()))
            .collect();

        {
            let mut w = writer.lock().unwrap();
            for sample in &samples {
                serde_json::to_writer(&mut *w, sample).unwrap();
                use std::io::Write;
                w.write_all(b"\n").unwrap();
            }
        }

        pb.inc(1);
    });

    pb.finish_with_message(format!("Done! Output: {}", args.output));
}

fn run_pk_mm(args: &Args) {
    let h_a = get_heuristic(&args.heuristic_a);
    let h_b = get_heuristic(&args.heuristic_b);
    let pk_depth = args.pk_depth;
    let seed_val = args.seed;

    println!("PK-MM mode: A={}(Dark) vs B={}(Light)", args.heuristic_a, args.heuristic_b);
    println!("  games: {} (pairs, 2 games each)", args.games);
    println!("  pk_depth: {}", pk_depth);

    let total_games = args.games * 2;
    let pb = ProgressBar::new(total_games as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template(
                "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} games ({eta})",
            )
            .unwrap(),
    );

    let results = std::sync::Mutex::new(PkMmResult {
        heuristic_a: args.heuristic_a.clone(),
        heuristic_b: args.heuristic_b.clone(),
        a_wins: 0,
        b_wins: 0,
        draws: 0,
        total: total_games as u32,
        a_as_dark_wins: 0,
        a_as_dark_total: 0,
        a_as_light_wins: 0,
        a_as_light_total: 0,
        games: Vec::new(),
    });

    let pairs: Vec<usize> = (0..args.games).collect();

    pairs.par_iter().for_each(|&pair_idx| {
        for game_in_pair in 0..2usize {
            let a_is_dark = game_in_pair == 0;
            let (h_dark, h_light, a_color_label) = if a_is_dark {
                (h_a, h_b, "dark")
            } else {
                (h_b, h_a, "light")
            };

            let mut h_seed = if seed_val == 0 {
                (pair_idx as u64 * 2 + game_in_pair as u64)
                    .wrapping_mul(0x9E3779B97F4A7C15)
                    .wrapping_add(0xFEDCBA9876543210)
            } else {
                seed_val
            };
            h_seed ^= (pair_idx as u64 * 2 + game_in_pair as u64);
            h_seed = h_seed.wrapping_mul(0x517cc1b727220a95);
            h_seed ^= h_seed >> 32;
            let seed = h_seed;
            let mut rng = SmallRng::seed_from_u64(seed);

            let (result, moves, move_log) = play_pk_mm_game(h_dark, h_light, pk_depth, args.random_open, &mut rng);

            let winner_str = match &result {
                crate::types::GameResult::Winner(crate::types::Color::Dark) => "dark",
                crate::types::GameResult::Winner(crate::types::Color::Light) => "light",
                crate::types::GameResult::Draw => "draw",
            };

            let a_won = match &result {
                crate::types::GameResult::Winner(c) => {
                    if a_is_dark { *c == crate::types::Color::Dark } else { *c == crate::types::Color::Light }
                }
                crate::types::GameResult::Draw => false,
            };

            {
                let mut r = results.lock().unwrap();
                if a_won {
                    r.a_wins += 1;
                } else if let crate::types::GameResult::Draw = &result {
                    r.draws += 1;
                } else {
                    r.b_wins += 1;
                }
                if a_is_dark {
                    r.a_as_dark_total += 1;
                    if a_won { r.a_as_dark_wins += 1; }
                } else {
                    r.a_as_light_total += 1;
                    if a_won { r.a_as_light_wins += 1; }
                }
                r.games.push(self_play::PkMmGameResult {
                    game_idx: (pair_idx * 2 + game_in_pair) as u32,
                    winner: winner_str.to_string(),
                    moves,
                    dark_heuristic: args.heuristic_a.clone(),
                    light_heuristic: args.heuristic_b.clone(),
                    move_log,
                });
            }

            pb.inc(1);
        }
    });

    pb.finish_with_message("PK-MM done!");

    let r = results.lock().unwrap();
    println!("\n=== PK-MM Results ===");
    println!("A ({}) wins: {} ({:.1}%)", args.heuristic_a, r.a_wins, r.a_wins as f64 / r.total as f64 * 100.0);
    println!("B ({}) wins: {} ({:.1}%)", args.heuristic_b, r.b_wins, r.b_wins as f64 / r.total as f64 * 100.0);
    println!("Draws: {} ({:.1}%)", r.draws, r.draws as f64 / r.total as f64 * 100.0);
    if r.a_as_dark_total > 0 {
        println!("A as dark: {}/{} ({:.1}%)", r.a_as_dark_wins, r.a_as_dark_total, r.a_as_dark_wins as f64 / r.a_as_dark_total as f64 * 100.0);
    }
    if r.a_as_light_total > 0 {
        println!("A as light: {}/{} ({:.1}%)", r.a_as_light_wins, r.a_as_light_total, r.a_as_light_wins as f64 / r.a_as_light_total as f64 * 100.0);
    }

    let pk_output = args.output.replace(".jsonl", "_pk_mm.json");
    let file = File::create(&pk_output).unwrap();
    serde_json::to_writer(BufWriter::new(file), &*r).unwrap();
    println!("Results saved to {}", pk_output);
}

#[cfg(feature = "neural")]
fn run_pk(args: &Args) {
    let model_b = args.model_b.as_ref().expect("--model-b is required for pk mode");
    println!("PK mode: model_a (Dark) vs model_b (Light)");
    println!("  model_a: {}", args.model);
    println!("  model_b: {}", model_b);
    println!("  games: {}", args.games);
    println!("  mcts_iterations: {}", args.mcts_iterations);

    let pb = ProgressBar::new(args.games as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template(
                "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} games ({eta})",
            )
            .unwrap(),
    );

    let results = std::sync::Mutex::new(PkResult {
        dark_wins: 0,
        light_wins: 0,
        draws: 0,
        total: args.games as u32,
        games: Vec::new(),
    });

    let indices: Vec<usize> = (0..args.games).collect();
    let model_a = args.model.clone();
    let model_b_path = model_b.clone();
    let mcts_iterations = args.mcts_iterations;
    let seed_val = args.seed;

    indices.par_iter().for_each(|&game_idx| {
        neural::init_thread_session(&model_a)
            .expect("Failed to init model A session");
        neural::init_thread_session_b(&model_b_path)
            .expect("Failed to init model B session");

        let mut h = if seed_val == 0 {
            (game_idx as u64).wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(0xABCDEF0123456789)
        } else {
            seed_val
        };
        h ^= game_idx as u64;
        h = h.wrapping_mul(0x517cc1b727220a95);
        h ^= h >> 32;
        let seed = h;
        let mut rng = SmallRng::seed_from_u64(seed);

        let (result, moves, final_score) = play_pk_game(mcts_iterations, &mut rng);

        let winner_str = match &result {
            crate::types::GameResult::Winner(crate::types::Color::Dark) => "dark",
            crate::types::GameResult::Winner(crate::types::Color::Light) => "light",
            crate::types::GameResult::Draw => "draw",
        };

        {
            let mut r = results.lock().unwrap();
            match &result {
                crate::types::GameResult::Winner(crate::types::Color::Dark) => r.dark_wins += 1,
                crate::types::GameResult::Winner(crate::types::Color::Light) => r.light_wins += 1,
                crate::types::GameResult::Draw => r.draws += 1,
            }
            r.games.push(self_play::PkGameResult {
                game_idx: game_idx as u32,
                winner: winner_str.to_string(),
                moves,
                dark_model: model_a.clone(),
                light_model: model_b_path.clone(),
                final_score_dark: final_score,
                move_log: Vec::new(),
            });
        }

        pb.inc(1);
    });

    pb.finish_with_message("PK done!");

    let r = results.lock().unwrap();
    println!("\n=== PK Results ===");
    println!("Model A (Dark): {} wins ({:.1}%)", r.dark_wins, r.dark_wins as f64 / r.total as f64 * 100.0);
    println!("Model B (Light): {} wins ({:.1}%)", r.light_wins, r.light_wins as f64 / r.total as f64 * 100.0);
    println!("Draws: {} ({:.1}%)", r.draws, r.draws as f64 / r.total as f64 * 100.0);

    let pk_output = args.output.replace(".jsonl", "_pk.json");
    let file = File::create(&pk_output).unwrap();
    serde_json::to_writer(BufWriter::new(file), &*r).unwrap();
    println!("Results saved to {}", pk_output);
}

#[cfg(feature = "neural")]
fn run_pk_mixed(args: &Args) {
    let dark_is_minimax = args.mode == "pk-mn";
    let dark_label = if dark_is_minimax { "minimax" } else { "neural" };
    let light_label = if dark_is_minimax { "neural" } else { "minimax" };
    println!("PK-mixed mode: Dark={} vs Light={}", dark_label, light_label);
    println!("  model: {}", args.model);
    println!("  minimax depth: {}", args.pk_depth);
    println!("  mcts_iterations: {}", args.mcts_iterations);
    println!("  games: {}", args.games);

    let pb = ProgressBar::new(args.games as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template(
                "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len} games ({eta})",
            )
            .unwrap(),
    );

    let results = std::sync::Mutex::new(PkResult {
        dark_wins: 0,
        light_wins: 0,
        draws: 0,
        total: args.games as u32,
        games: Vec::new(),
    });

    let indices: Vec<usize> = (0..args.games).collect();
    let model_path = args.model.clone();
    let mcts_iterations = args.mcts_iterations;
    let pk_depth = args.pk_depth;
    let seed_val = args.seed;

    indices.par_iter().for_each(|&game_idx| {
        if !dark_is_minimax {
            neural::init_thread_session(&model_path)
                .expect("Failed to init neural session");
        }

        let mut h = if seed_val == 0 {
            (game_idx as u64).wrapping_mul(0x9E3779B97F4A7C15).wrapping_add(0xABCDEF0123456789)
        } else {
            seed_val
        };
        h ^= game_idx as u64;
        h = h.wrapping_mul(0x517cc1b727220a95);
        h ^= h >> 32;
        let seed = h;
        let mut rng = SmallRng::seed_from_u64(seed);

        let (result, moves, move_log) = play_pk_mixed_game(
            dark_is_minimax,
            mcts_iterations,
            pk_depth,
            &model_path,
            &mut rng,
        );

        let winner_str = match &result {
            crate::types::GameResult::Winner(crate::types::Color::Dark) => "dark",
            crate::types::GameResult::Winner(crate::types::Color::Light) => "light",
            crate::types::GameResult::Draw => "draw",
        };

        {
            let mut r = results.lock().unwrap();
            match &result {
                crate::types::GameResult::Winner(crate::types::Color::Dark) => r.dark_wins += 1,
                crate::types::GameResult::Winner(crate::types::Color::Light) => r.light_wins += 1,
                crate::types::GameResult::Draw => r.draws += 1,
            }
            r.games.push(self_play::PkGameResult {
                game_idx: game_idx as u32,
                winner: winner_str.to_string(),
                moves,
                dark_model: dark_label.to_string(),
                light_model: light_label.to_string(),
                final_score_dark: 0,
                move_log,
            });
        }

        pb.inc(1);
    });

    pb.finish_with_message("PK-mixed done!");

    let r = results.lock().unwrap();
    println!("\n=== PK-mixed Results ===");
    println!("Dark ({}): {} wins ({:.1}%)", dark_label, r.dark_wins, r.dark_wins as f64 / r.total as f64 * 100.0);
    println!("Light ({}): {} wins ({:.1}%)", light_label, r.light_wins, r.light_wins as f64 / r.total as f64 * 100.0);
    println!("Draws: {} ({:.1}%)", r.draws, r.draws as f64 / r.total as f64 * 100.0);

    let pk_output = args.output.replace(".jsonl", "_pk_mixed.json");
    let file = File::create(&pk_output).unwrap();
    serde_json::to_writer(BufWriter::new(file), &*r).unwrap();
    println!("Results saved to {}", pk_output);
}
