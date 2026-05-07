use crate::encoding::encode_board;
use crate::types::Board;
use ndarray::Array4;
use ort::session::Session;
use std::cell::RefCell;
use std::sync::{Arc, Mutex};

thread_local! {
    static THREAD_SESSION_A: RefCell<Option<Arc<Mutex<Session>>>> = RefCell::new(None);
    static THREAD_SESSION_B: RefCell<Option<Arc<Mutex<Session>>>> = RefCell::new(None);
}

pub fn init_thread_session(model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let session = Session::builder()?.commit_from_file(model_path)?;
    THREAD_SESSION_A.with(|cell| {
        *cell.borrow_mut() = Some(Arc::new(Mutex::new(session)));
    });
    Ok(())
}

pub fn init_thread_session_b(model_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let session = Session::builder()?.commit_from_file(model_path)?;
    THREAD_SESSION_B.with(|cell| {
        *cell.borrow_mut() = Some(Arc::new(Mutex::new(session)));
    });
    Ok(())
}

pub fn get_thread_session() -> Arc<Mutex<Session>> {
    THREAD_SESSION_A.with(|cell| {
        cell.borrow()
            .as_ref()
            .expect("Thread session A not initialized. Call init_thread_session first.")
            .clone()
    })
}

pub fn get_thread_session_b() -> Arc<Mutex<Session>> {
    THREAD_SESSION_B.with(|cell| {
        cell.borrow()
            .as_ref()
            .expect("Thread session B not initialized. Call init_thread_session_b first.")
            .clone()
    })
}

pub fn get_session_for_color(color: crate::types::Color) -> Arc<Mutex<Session>> {
    THREAD_SESSION_B.with(|cell_b| {
        if cell_b.borrow().is_some() {
            match color {
                crate::types::Color::Dark => get_thread_session(),
                crate::types::Color::Light => get_thread_session_b(),
            }
        } else {
            get_thread_session()
        }
    })
}

pub struct NeuralEval {
    pub policy: Vec<f32>,
    pub value: f32,
}

fn softmax(logits: &[f32]) -> Vec<f32> {
    let max_val = logits.iter().copied().fold(f32::NEG_INFINITY, f32::max);
    let exps: Vec<f32> = logits.iter().map(|&x| (x - max_val).exp()).collect();
    let sum: f32 = exps.iter().sum();
    exps.iter().map(|&e| e / sum).collect()
}

pub fn neural_evaluate(session: &mut Session, board: &Board) -> Result<NeuralEval, Box<dyn std::error::Error>> {
    let encoded = encode_board(board);
    let input_array = Array4::from_shape_vec((1, 20, 9, 7), encoded)?;
    let input_name = session.inputs()[0].name().to_string();

    let outputs = session.run(ort::inputs![input_name => ort::value::TensorRef::from_array_view(input_array.view())?])?;

    let (_, policy_data) = outputs[0].try_extract_tensor::<f32>()?;
    let (_, value_data) = outputs[1].try_extract_tensor::<f32>()?;

    let policy_logits: Vec<f32> = policy_data.to_vec();
    let raw_value = value_data[0];

    let policy = softmax(&policy_logits);
    let value = (raw_value + 1.0) / 2.0;

    Ok(NeuralEval { policy, value })
}

pub fn dirichlet_noise(len: usize, alpha: f32, rng: &mut impl rand::Rng) -> Vec<f32> {
    let mut samples = Vec::with_capacity(len);
    for _ in 0..len {
        let g = rand_distr::Gamma::new(alpha, 1.0).unwrap();
        samples.push(rng.sample(g) as f32);
    }
    let sum: f32 = samples.iter().sum();
    if sum > 0.0 {
        for s in samples.iter_mut() {
            *s /= sum;
        }
    }
    samples
}
