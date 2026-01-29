# WebSocket Bridge Design

Enable external devices (phones) to receive Claudy state updates over the local network.

## Decisions

| Aspect | Decision |
|--------|----------|
| Security | None (local network only) |
| Port | Fixed: 3695 |
| Frontend | Same codebase, Tauri detection |
| Data | Full ClaudyState as JSON |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Desktop (Tauri)                                         │
│                                                         │
│  SessionWatcher ──► ClaudyState ──┬──► Tauri emit()     │
│       │                           │      ↓              │
│       │                           │   Tauri frontend    │
│       ▼                           │                     │
│  .jsonl filer                     └──► WS broadcast()   │
│                                           ↓             │
└───────────────────────────────────────────│─────────────┘
                                            │ port 3695
                                    ┌───────▼───────┐
                                    │  Phone        │
                                    │  (browser)    │
                                    │               │
                                    │  WebSocket    │
                                    │  client       │
                                    └───────────────┘
```

## Implementation

### 1. Rust WebSocket Server

**New file:** `src-tauri/src/websocket.rs`

- Start on port 3695 at app launch
- Maintain list of connected clients
- Broadcast full ClaudyState (JSON) on state change
- Send current state to new clients on connect

**Library:** `tokio-tungstenite`

**Message format:**
```json
{
  "current_state": "thinking",
  "active_projects": ["project-a"],
  "focused_project": "project-a",
  "last_event": { ... }
}
```

### 2. Integration in main.rs

- Start WebSocket server in separate tokio task
- Create channel between SessionWatcher and WS server
- On state change: emit to Tauri + broadcast to WS

### 3. Frontend Changes

**Detection in main.ts:**
```typescript
const isTauri = '__TAURI__' in window;

if (isTauri) {
  listen<string>("claudy-state-change", ...);
} else {
  connectWebSocket();
}
```

**WebSocket client:**
- Connect to `ws://<same-host>:3695`
- Get host from `window.location.hostname`
- Parse JSON, update UI same as Tauri event
- Auto-reconnect on disconnect (5 sec delay)

**Invoke calls:**
- In Tauri: works as before
- In browser: not needed, WS sends full state

## Error Handling

| Scenario | Handling |
|----------|----------|
| Port 3695 busy | Log error, continue without WS |
| Phone loses connection | Auto-reconnect after 5 sec |
| No WS server | Phone shows "Connecting..." |

## Files to Change

| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Add tokio-tungstenite dependency |
| `src-tauri/src/websocket.rs` | New: WebSocket server |
| `src-tauri/src/main.rs` | Start WS server, broadcast on state change |
| `src/main.ts` | Add Tauri detection + WebSocket client |

## Testing

1. Start Claudy desktop app
2. Open `http://<desktop-ip>:5173` on phone
3. Trigger Claude Code events
4. Verify phone receives state updates
