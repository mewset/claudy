# Claudy Engine Refactoring Design

**Datum**: 2026-02-01
**Status**: Planerad
**Syfte**: Separera kommentarsystemet och skapa en utbyggbar arkitektur för personlighets-motor

## Bakgrund

Claudy (Claude + Clippy) har idag ett hårdkodat kommentarsystem där state direkt mappar till slumpmässiga kommentarer. För att bygga en intelligent personlighets-motor som kan analysera konversationsflödet behöver vi separera ansvarsområden.

### Nuvarande system
```
JSONL Event → State → (Animation + Hårdkodad kommentar)
```

### Nytt system
```
JSONL Event → Extraction Engine → Rich Context → Animation Engine
                                              → Personality Engine
```

## Arkitekturöversikt

```
┌─────────────────────────────────────────────────────────────────┐
│                     JSONL-loggar (~/.claude/projects/)          │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTRACTION ENGINE                             │
│                  src/engine/extraction/                         │
└─────────────────────────┬───────────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     CONTEXT STATE                               │
│                   src/engine/context.ts                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│ ANIMATION ENGINE │            │PERSONALITY ENGINE│
│ src/engine/      │            │ src/engine/      │
│   animation/     │            │   personality/   │
└────────┬─────────┘            └────────┬─────────┘
         ▼                               ▼
┌──────────────────┐            ┌──────────────────┐
│   Claudy Sprite  │            │  Speech Bubble   │
└──────────────────┘            └──────────────────┘
```

## Designbeslut

| Beslut | Val | Motivering |
|--------|-----|------------|
| Datakälla | JSONL-loggar (ingen API) | Finns redan, ingen extra kostnad |
| Analysdjup | Sentiment + uppgiftstyp + progress | Rik kontext för smarta kommentarer |
| Kommentarsstruktur | Kategorier + templates | Typsäkert, utbyggbart, testbart |
| Personlighet | Clippy-inspirerad | "Det ser ut som att du..." |
| Kodorganisation | TypeScript-moduler | Separation of concerns |

## 1. Extraction Engine

**Placering**: `src/engine/extraction/`

### types.ts
```typescript
export type ClaudeEventType =
  | "session_start"
  | "user_message"
  | "thinking"
  | "tool_use"
  | "tool_result"
  | "talking"
  | "waiting"
  | "stop"
  | "error";

export type FileType = "code" | "config" | "style" | "docs" | "test" | "unknown";

export interface ClaudyContext {
  // Event
  event: ClaudeEventType;
  project: string;
  timestamp: number;

  // Tool
  tool?: string;
  targetFile?: string;
  fileType?: FileType;

  // Session
  sessionStart: number;
  sessionDuration: number;
  eventCount: number;

  // Patterns
  sameFileCount: number;
  sameToolCount: number;
  recentErrors: number;
  lastFiles: string[];

  // Result
  result?: "success" | "error" | "pending";
  errorMessage?: string;

  // User input analysis
  userMessageLength?: "short" | "medium" | "long";
}
```

### parser.ts
Parsear rå JSONL-events till strukturerade `ClaudeEventType`.

### session-tracker.ts
Håller sessionshistorik för att beräkna:
- `sessionDuration` - tid sedan start
- `eventCount` - antal events
- `sameFileCount` - hur många gånger samma fil rörts
- `sameToolCount` - samma verktyg i rad
- `recentErrors` - antal fel senaste N events

### file-classifier.ts
```typescript
export function classifyFile(path: string): FileType {
  if (/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(path)) return "test";
  if (/\.(css|scss|less|styled)/.test(path)) return "style";
  if (/\.(md|txt|doc)$/.test(path)) return "docs";
  if (/(package|tsconfig|\.config|\.rc)/.test(path)) return "config";
  if (/\.(ts|js|tsx|jsx|rs|py)$/.test(path)) return "code";
  return "unknown";
}
```

## 2. Context State

**Placering**: `src/engine/context.ts`

Central state-hantering med pub/sub-mönster.

```typescript
export class ContextState {
  private tracker: SessionTracker;
  private listeners: Array<(ctx: ClaudyContext) => void> = [];

  handleEvent(rawEvent: RawClaudeEvent): void {
    const context = this.buildContext(rawEvent);
    this.tracker.record(context);
    this.notify(context);
  }

  subscribe(listener: (ctx: ClaudyContext) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}
```

## 3. Animation Engine

**Placering**: `src/engine/animation/`

### types.ts
```typescript
export type ClaudyPose =
  | "intro" | "idle" | "wake" | "listening"
  | "thinking" | "working" | "talking"
  | "happy" | "confused" | "sleepy";
```

### animator.ts
Tar `ClaudyContext` och returnerar lämplig `ClaudyPose`. Kan vara smartare än dagens 1:1-mapping:
- Lång session → ibland `sleepy`
- Flera errors → `confused`
- Success efter kamp → extra `happy`

### sprite-controller.ts
Applicerar pose på DOM via befintlig CSS-logik.

## 4. Personality Engine

**Placering**: `src/engine/personality/`

### types.ts
```typescript
export interface Comment {
  text: string;
  priority: number;  // Högre = mer specifik
}

export interface CommentCategory {
  match: (ctx: ClaudyContext) => boolean;
  comments: Comment[] | ((ctx: ClaudyContext) => Comment[]);
}
```

### Kategorier (`categories/`)

**debugging.ts** - Samma fil flera gånger, errors i rad
```typescript
{
  match: (ctx) => ctx.sameFileCount >= 3,
  comments: [
    { text: "Tillbaka till samma fil igen... klassiker!", priority: 10 },
    { text: "Det ser ut som att du försöker debugga. Vill du ha hjälp? 📎", priority: 15 },
  ]
}
```

**tools.ts** - Verktygsspecifika kommentarer
```typescript
{
  match: (ctx) => ctx.tool === "Edit" && ctx.fileType === "style",
  comments: [
    { text: "Pillar på stylingen!", priority: 5 },
    { text: "CSS-magi pågår...", priority: 5 },
  ]
}
```

**session.ts** - Start, paus-påminnelser, avslut
```typescript
{
  match: (ctx) => ctx.sessionDuration > 7200,
  comments: [
    { text: "Lång session! Dags för en paus kanske?", priority: 15 },
    { text: "Du har kodat i över 2 timmar. Kaffe? ☕", priority: 15 },
  ]
}
```

**clippy.ts** - Speciella Clippy-moment
```typescript
{
  match: (ctx) => ctx.targetFile?.includes("README"),
  comments: [
    { text: "Det ser ut som att du skriver dokumentation. Vill du ha hjälp? 📎", priority: 20 },
  ]
}
```

### selector.ts
Samlar alla kategorier, hittar matchningar, väljer baserat på prioritet.

```typescript
export class PersonalityEngine {
  selectComment(ctx: ClaudyContext): string | null {
    // 1. Hitta alla matchande kategorier
    // 2. Samla comments med prioritet
    // 3. Välj slumpmässigt bland högst prioritet
  }
}
```

## 5. Filstruktur

```
src/
├── engine/
│   ├── extraction/
│   │   ├── types.ts
│   │   ├── parser.ts
│   │   ├── session-tracker.ts
│   │   └── file-classifier.ts
│   │
│   ├── animation/
│   │   ├── types.ts
│   │   ├── animator.ts
│   │   └── sprite-controller.ts
│   │
│   ├── personality/
│   │   ├── types.ts
│   │   ├── selector.ts
│   │   └── categories/
│   │       ├── index.ts
│   │       ├── debugging.ts
│   │       ├── tools.ts
│   │       ├── session.ts
│   │       └── clippy.ts
│   │
│   └── context.ts
│
├── main.ts
└── ...
```

## 6. Integration

```typescript
// main.ts
import { ContextState } from "./engine/context";
import { AnimationEngine } from "./engine/animation/animator";
import { PersonalityEngine } from "./engine/personality/selector";
import { SpriteController } from "./engine/animation/sprite-controller";

const contextState = new ContextState();
const animationEngine = new AnimationEngine();
const personalityEngine = new PersonalityEngine();
const spriteController = new SpriteController();

contextState.subscribe((ctx) => {
  const pose = animationEngine.selectPose(ctx);
  spriteController.setPose(pose);

  const comment = personalityEngine.selectComment(ctx);
  if (comment) {
    showBubble(comment);
  }
});
```

## 7. Migrationsstrategi

| Fas | Beskrivning |
|-----|-------------|
| 1 | Skapa `engine/`-strukturen, definiera types |
| 2 | Implementera Extraction Engine med rikare parsing |
| 3 | Refaktorera animation till AnimationEngine |
| 4 | Bygga PersonalityEngine med kategorier |
| 5 | Koppla ihop allt, ta bort gammal kod |

## 8. Framtida utbyggnad

- **Fler kategorier** - Ny fil i `categories/`
- **Smartare animation** - Utöka `selectPose()`
- **Mood-tracking** - Personlighet över tid
- **Konfigurerbar "irriterande nivå"** - Settings 🎚️
- **A/B-testning** - Logga och mät kommentarseffekt
