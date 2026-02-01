use futures_util::{SinkExt, StreamExt};
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::tungstenite::Message;

use crate::state::SharedState;

const WS_PORT: u16 = 3695;

pub type StateBroadcaster = broadcast::Sender<String>;

/// Start the WebSocket server and return a broadcaster for sending state updates
pub async fn start_server(shared_state: SharedState) -> Option<StateBroadcaster> {
    let addr = format!("0.0.0.0:{}", WS_PORT);

    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[Claudy WS] Failed to bind to {}: {}", addr, e);
            return None;
        }
    };

    eprintln!("[Claudy WS] Server listening on ws://0.0.0.0:{}", WS_PORT);

    // Broadcast channel for state updates (capacity 16 should be plenty)
    let (tx, _rx) = broadcast::channel::<String>(16);
    let tx_clone = tx.clone();

    // Spawn the accept loop
    tokio::spawn(async move {
        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let rx = tx_clone.subscribe();
                    let tx = tx_clone.clone();
                    let state = shared_state.clone();
                    tokio::spawn(handle_connection(stream, addr, rx, tx, state));
                }
                Err(e) => {
                    eprintln!("[Claudy WS] Accept error: {}", e);
                }
            }
        }
    });

    Some(tx)
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    mut rx: broadcast::Receiver<String>,
    tx: StateBroadcaster,
    shared_state: SharedState,
) {
    eprintln!("[Claudy WS] New connection from {}", addr);

    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            eprintln!("[Claudy WS] WebSocket handshake failed for {}: {}", addr, e);
            return;
        }
    };

    let (mut write, mut read) = ws_stream.split();

    // Send intro state on connect (so the intro animation plays)
    let initial_json = {
        let state = shared_state.lock().unwrap();
        let mut intro_state = state.clone();
        intro_state.current_state = "intro".to_string();
        serde_json::to_string(&intro_state).unwrap_or_else(|_| "{}".to_string())
    }; // MutexGuard dropped here, before await

    if let Err(e) = write.send(Message::Text(initial_json)).await {
        eprintln!("[Claudy WS] Failed to send initial state to {}: {}", addr, e);
        return;
    }

    // Spawn a task to handle incoming messages (state updates from clients)
    let addr_clone = addr;
    let shared_state_clone = shared_state.clone();
    tokio::spawn(async move {
        while let Some(msg) = read.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    // Try to parse as state update
                    if let Ok(incoming) = serde_json::from_str::<crate::state::ClaudyState>(&text) {
                        eprintln!("[Claudy WS] Received state from {}: {} (bubble: {:?})",
                            addr_clone, incoming.current_state, incoming.bubble_text);
                        // Update shared state (but not bubble_text - it's ephemeral)
                        {
                            let mut state = shared_state_clone.lock().unwrap();
                            state.current_state = incoming.current_state.clone();
                            if !incoming.active_projects.is_empty() {
                                state.active_projects = incoming.active_projects.clone();
                            }
                        }
                        // Broadcast incoming state directly (includes bubble_text)
                        if let Ok(json) = serde_json::to_string(&incoming) {
                            let _ = tx.send(json);
                        }
                    }
                }
                Ok(Message::Close(_)) => break,
                Err(_) => break,
                _ => {}
            }
        }
        eprintln!("[Claudy WS] Read loop ended for {}", addr_clone);
    });

    // Forward broadcast messages to this client
    loop {
        match rx.recv().await {
            Ok(state_json) => {
                if let Err(e) = write.send(Message::Text(state_json)).await {
                    eprintln!("[Claudy WS] Send error for {}: {}", addr, e);
                    break;
                }
            }
            Err(broadcast::error::RecvError::Closed) => {
                eprintln!("[Claudy WS] Broadcast channel closed");
                break;
            }
            Err(broadcast::error::RecvError::Lagged(n)) => {
                eprintln!("[Claudy WS] Client {} lagged by {} messages", addr, n);
                // Continue anyway, they'll get the next update
            }
        }
    }

    eprintln!("[Claudy WS] Connection closed for {}", addr);
}

/// Broadcast state to all connected clients
pub fn broadcast_state(tx: &StateBroadcaster, state: &crate::state::ClaudyState) {
    match serde_json::to_string(state) {
        Ok(json) => {
            // Ignore send errors (no receivers is fine)
            let _ = tx.send(json);
        }
        Err(e) => {
            eprintln!("[Claudy WS] Failed to serialize state: {}", e);
        }
    }
}
