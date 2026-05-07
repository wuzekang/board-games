use crate::heuristic::{evaluate_board, move_order_score};
use crate::neural::{dirichlet_noise, neural_evaluate};
use crate::rules::{all_valid_moves, apply_move, get_game_result};
use crate::types::{Board, Color, GameResult, Move};
use ort::session::Session;
use std::sync::{Arc, Mutex};

pub struct MctsConfig {
    pub iterations: u32,
    pub c: f32,
    pub use_neural: bool,
    pub dirichlet_alpha: f32,
    pub dirichlet_frac: f32,
}

impl Default for MctsConfig {
    fn default() -> Self {
        MctsConfig {
            iterations: 50,
            c: 1.4,
            use_neural: false,
            dirichlet_alpha: 0.3,
            dirichlet_frac: 0.25,
        }
    }
}

struct MctsNode {
    board: Board,
    mv: Option<Move>,
    visits: u32,
    total: f32,
    children: Vec<u32>,
    parent: Option<u32>,
    untried_start: u16,
    untried_count: u16,
    prior: f32,
}

pub struct MctsArena {
    nodes: Vec<MctsNode>,
    moves_buf: Vec<Move>,
    priors_buf: Vec<f32>,
    session: Option<Arc<Mutex<Session>>>,
}

fn eval_to_value(score: i32) -> f32 {
    let clamped = score.max(-3000).min(3000) as f32;
    1.0 / (1.0 + (-clamped / 500.0).exp())
}

impl MctsArena {
    pub fn new() -> Self {
        MctsArena {
            nodes: Vec::with_capacity(8192),
            moves_buf: Vec::with_capacity(64),
            priors_buf: Vec::with_capacity(64),
            session: None,
        }
    }

    pub fn set_session(&mut self, session: Arc<Mutex<Session>>) {
        self.session = Some(session);
    }

    pub fn clear(&mut self) {
        self.nodes.clear();
    }

    fn add_node(&mut self, board: Board, mv: Option<Move>, parent: Option<u32>, prior: f32) -> u32 {
        let id = self.nodes.len() as u32;
        self.nodes.push(MctsNode {
            board,
            mv,
            visits: 0,
            total: 0.0,
            children: Vec::new(),
            parent,
            untried_start: 0,
            untried_count: 0,
            prior,
        });
        id
    }

    fn ensure_expanded(&mut self, node_id: u32) {
        let node = &self.nodes[node_id as usize];
        if node.untried_count > 0 || !node.children.is_empty() {
            return;
        }

        let board = node.board.clone();
        let color = board.next_color;
        let moves = all_valid_moves(&board, color);

        let neural_policy = if self.session.is_some() {
            let mut sess = self.session.as_ref().unwrap().lock().unwrap();
            match neural_evaluate(&mut sess, &board) {
                Ok(eval) => Some(eval.policy),
                Err(_) => None,
            }
        } else {
            None
        };

        let mut indexed: Vec<(Move, f32)> = moves
            .iter()
            .map(|&m| {
                let prior = match &neural_policy {
                    Some(p) => p[m.move_idx() as usize],
                    None => 1.0 / moves.len() as f32,
                };
                (m, prior)
            })
            .collect();

        if neural_policy.is_none() {
            indexed.sort_by(|a, b| {
                move_order_score(&b.0, &board, color)
                    .cmp(&move_order_score(&a.0, &board, color))
            });
        } else {
            indexed.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        }

        let start = self.moves_buf.len() as u16;
        for (m, p) in &indexed {
            self.moves_buf.push(*m);
            self.priors_buf.push(*p);
        }
        let count = self.moves_buf.len() as u16 - start;

        let node = &mut self.nodes[node_id as usize];
        node.untried_start = start;
        node.untried_count = count;
    }

    fn apply_root_noise(&mut self, root_id: u32, config: &MctsConfig, rng: &mut impl rand::Rng) {
        let n_children = self.nodes[root_id as usize].children.len();
        if n_children == 0 {
            return;
        }

        let noise = dirichlet_noise(n_children, config.dirichlet_alpha, rng);

        let child_ids: Vec<u32> = self.nodes[root_id as usize].children.clone();
        for (i, &child_id) in child_ids.iter().enumerate() {
            self.nodes[child_id as usize].prior =
                (1.0 - config.dirichlet_frac) * self.nodes[child_id as usize].prior
                    + config.dirichlet_frac * noise[i];
        }

        let sum: f32 = child_ids.iter().map(|&cid| self.nodes[cid as usize].prior).sum();
        if sum > 0.0 {
            for &child_id in &child_ids {
                self.nodes[child_id as usize].prior /= sum;
            }
        }
    }

    fn select(&self, node_id: u32, c: f32, use_puct: bool) -> u32 {
        let mut current = node_id;
        loop {
            let node = &self.nodes[current as usize];

            if node.untried_count > 0 {
                return current;
            }

            if node.children.is_empty() {
                return current;
            }

            let sqrt_parent = (node.visits as f32).sqrt();
            let mut best_child = node.children[0];
            let mut best_score = f32::NEG_INFINITY;

            for &child_id in &node.children {
                let child = &self.nodes[child_id as usize];
                let q = if child.visits > 0 {
                    child.total / child.visits as f32
                } else {
                    0.5
                };

                let score = if use_puct {
                    let u = c * child.prior * sqrt_parent / (1.0 + child.visits as f32);
                    q + u
                } else {
                    let explore = if child.visits > 0 && node.visits > 0 {
                        c * ((node.visits as f32).ln() / child.visits as f32).sqrt()
                    } else {
                        c
                    };
                    q + explore
                };

                if score > best_score {
                    best_score = score;
                    best_child = child_id;
                }
            }

            current = best_child;

            if get_game_result(
                &self.nodes[current as usize].board,
                self.nodes[current as usize].board.next_color,
            )
            .is_some()
            {
                return current;
            }
        }
    }

    fn expand(&mut self, node_id: u32) -> u32 {
        let node = &self.nodes[node_id as usize];
        if node.untried_count == 0 {
            return node_id;
        }

        let moves_start = node.untried_start as usize;
        let untried_offset = (node.untried_count - 1) as usize;
        let mv = self.moves_buf[moves_start + untried_offset];
        let prior = self.priors_buf[moves_start + untried_offset];
        let board = node.board.clone();
        let new_board = apply_move(&board, mv);

        let child_id = self.add_node(new_board, Some(mv), Some(node_id), prior);
        self.nodes[node_id as usize].children.push(child_id);
        self.nodes[node_id as usize].untried_count -= 1;

        child_id
    }

    fn evaluate_node(&mut self, board: &Board, ai_color: Color, use_neural: bool) -> f32 {
        if let Some(result) = get_game_result(board, board.next_color) {
            return match result {
                GameResult::Winner(w) if w == ai_color => 1.0,
                GameResult::Winner(_) => 0.0,
                GameResult::Draw => 0.5,
            };
        }

        if use_neural {
            if let Some(ref sess_arc) = self.session {
                let mut sess = sess_arc.lock().unwrap();
                if let Ok(eval) = neural_evaluate(&mut sess, board) {
                    return if board.next_color == ai_color {
                        eval.value
                    } else {
                        1.0 - eval.value
                    };
                }
            }
        }

        let score = evaluate_board(board, ai_color);
        eval_to_value(score)
    }

    fn backpropagate(&mut self, leaf_id: u32, value: f32) {
        let mut current = Some(leaf_id);
        let mut flip = false;
        while let Some(id) = current {
            let node = &mut self.nodes[id as usize];
            node.visits += 1;
            node.total += if flip { 1.0 - value } else { value };
            current = node.parent;
            flip = !flip;
        }
    }

    pub fn run_mcts(
        &mut self,
        board: &Board,
        ai_color: Color,
        config: &MctsConfig,
        rng: &mut impl rand::Rng,
    ) -> (Option<Move>, Vec<(Move, u32)>) {
        self.clear();
        let root_id = self.add_node(board.clone(), None, None, 1.0);

        for _ in 0..config.iterations {
            let selected = self.select(root_id, config.c, config.use_neural);

            let game_result = get_game_result(
                &self.nodes[selected as usize].board,
                self.nodes[selected as usize].board.next_color,
            );

            let (leaf, value) = if let Some(result) = game_result {
                let val = match result {
                    GameResult::Winner(w) if w == ai_color => 1.0,
                    GameResult::Winner(_) => 0.0,
                    GameResult::Draw => 0.5,
                };
                (selected, val)
            } else if self.nodes[selected as usize].visits == 0 {
                let board_clone = self.nodes[selected as usize].board.clone();
                let val = self.evaluate_node(&board_clone, ai_color, config.use_neural);
                (selected, val)
            } else {
                self.ensure_expanded(selected);
                let leaf = self.expand(selected);
                let board_clone = self.nodes[leaf as usize].board.clone();
                let val = self.evaluate_node(&board_clone, ai_color, config.use_neural);
                (leaf, val)
            };

            self.backpropagate(leaf, value);
        }

        if config.use_neural && config.dirichlet_frac > 0.0 {
            self.apply_root_noise(root_id, config, rng);
        }

        let root = &self.nodes[root_id as usize];
        if root.children.is_empty() {
            return (None, Vec::new());
        }

        let mut best = root.children[0];
        for &child_id in &root.children {
            if self.nodes[child_id as usize].visits > self.nodes[best as usize].visits {
                best = child_id;
            }
        }

        let policy: Vec<(Move, u32)> = root
            .children
            .iter()
            .filter_map(|&cid| {
                self.nodes[cid as usize]
                    .mv
                    .map(|m| (m, self.nodes[cid as usize].visits))
            })
            .collect();

        (self.nodes[best as usize].mv, policy)
    }
}
