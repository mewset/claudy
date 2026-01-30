# Claudy Personality Engine Design

**Datum:** 2026-01-30
**Branch:** `feature/personality-engine`
**Status:** Design klar, redo för implementation

---

## Vision

**Claudy = Claude + Clippy**

Claudy är inte bara en statusindikator — det är Claude i companion-form. När Claude tänker, tänker Claudy. När Claude skriver kod, jobbar Claudy. Men till skillnad från Clippy vet Claudy när den ska hålla käften.

### Varför detta projekt?

MVP:n vi byggde visar vad Claude *gör* (Thinking, ToolUse, Talking). Men den saknar:
- Förståelse för *vad* som händer (debugging vs building vs learning)
- Empati för användarens *mood* (frustrerad, nöjd, stuck)
- Personlighet som gör Claudy charming istället för bara informativ

### Designprinciper

1. **Claudy ÄR Claude** — Inte en observatör, utan Claudes fysiska manifestation
2. **Charm > Information** — Bättre att vara tyst än att vara irriterande
3. **Graceful degradation** — Om personality engine failar, funkar animationer ändå
4. **Enkel att tweaka** — Kommentarer i TOML-filer, ingen rebuild krävs

---

## Arkitektur

### Systemöversikt

```
┌─────────────────────────────────────────────────────┐
│                 JSONL Watcher                       │
│            (redan implementerad)                    │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│              Personality Engine                      │
│  ┌─────────────────┐    ┌─────────────────────┐    │
│  │  Event Reactor  │    │  Content Analyzer   │    │
│  │  (ClaudeEvent)  │    │  (message text)     │    │
│  └────────┬────────┘    └──────────┬──────────┘    │
│           │                        │               │
│           ▼                        ▼               │
│  ┌─────────────────────────────────────────────┐   │
│  │           Mood + Comment Decider            │   │
│  └─────────────────────┬───────────────────────┘   │
└────────────────────────┼───────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│                    Frontend UI                       │
│         (animation, expression, speech bubble)       │
└─────────────────────────────────────────────────────┘
```

### Varför två parallella system?

**Event Reactor** (befintlig) hanterar *vad Claude gör*:
- `Thinking` → thinking-animation
- `ToolUse` → tool-specifik animation
- `Talking` → talking-animation

**Content Analyzer** (ny) hanterar *vad som händer*:
- Läser meddelandetext
- Detekterar kontext (debugging, building, etc.)
- Känner av sentiment (frustrerad, nöjd, etc.)

De jobbar tillsammans: Event Reactor bestämmer animation, Content Analyzer bestämmer om/vilken kommentar som visas.

---

## Content Analyzer

### Syfte

Extrahera *kontext* och *sentiment* från meddelandetext för att göra Claudy kontextmedveten.

### Output-struktur

```rust
struct AnalysisResult {
    context: Option<Context>,   // Vad handlar det om?
    sentiment: Option<Sentiment>, // Hur känns det?
    triggers: Vec<Trigger>      // Vad ska vi reagera på?
}

enum Context {
    Debugging,
    Building,
    Testing,
    Learning,
    Refactoring,
    Deploying,
}

enum Sentiment {
    Frustrated,
    Confused,
    Happy,
    Neutral,
}
```

### Kontext-detection

**Metod:** Keyword-matching (enkelt, snabbt, tillräckligt bra för v1)

| Context | Keywords (EN) | Keywords (SV) |
|---------|---------------|---------------|
| `Debugging` | error, bug, fix, broken, fail, stacktrace, exception | fel, bugg, fixa, trasig, krasch, funkar inte |
| `Building` | create, add, implement, build, feature, new | skapa, lägg till, implementera, bygga, funktion |
| `Testing` | test, spec, assert, coverage, pass, fail | test, täckning |
| `Learning` | how, why, explain, what is, understand | hur, varför, förklara, vad är |
| `Refactoring` | refactor, clean, improve, rename, move | refaktorera, städa, förbättra |
| `Deploying` | deploy, ship, release, production, merge | deploya, releasa, produktion |

**Varför keyword-baserad?**
- Enkelt att implementera och debugga
- Lätt att utöka med fler språk
- Tillräckligt bra för att ge Claudy "känsla"
- Inga externa dependencies (ML-modeller etc.)

### Sentiment-detection

**Metod:** Heuristik baserad på textmönster

| Signal | Indikerar | Varför |
|--------|-----------|--------|
| `???`, `?!` | Förvirring | Upprepade frågetecken = osäkerhet |
| `!!!`, CAPS | Frustration/excitement | Betoning = stark känsla |
| Korta meddelanden (<5 ord) + `?` | Otålighet | "Varför?" istället för full fråga |
| "tack", "nice", "perfekt" | Nöjd | Positiva ord |
| "fan", "skit", "varför" (SV) | Frustration | Svenska svordomar |
| Samma error 2+ gånger | Stuck | Repetition = problem |

### Flerspråksstöd

**Princip:** Claudy *lyssnar* på flera språk, men *svarar* alltid på engelska.

**Varför?**
- Användare skriver naturligt på sitt språk
- Engelska kommentarer ger konsekvent Claudy-personlighet
- Enkelt att utöka med fler språk (bara lägg till keywords)

**Första iteration:** Engelska + Svenska

**Filstruktur:**
```toml
# personality/keywords.toml
[contexts.debugging]
keywords = [
  # English
  "error", "bug", "fix", "broken",
  # Swedish
  "fel", "bugg", "fixa", "trasig"
]
```

---

## Comment Trigger System

### Problemet

Clippy var irriterande för att den pratade *för mycket*. Claudy måste veta när den ska hålla käften.

### Lösningen: Hierarkisk trigger-logik

```
┌─────────────────────────────────────────────────┐
│              Milstolpe?                         │
│   (session start, första error, tests pass)    │
│                    │                            │
│         JA ───────►│ 100% kommentar            │
│                    │                            │
│         NEJ        ▼                            │
│              Emotionell topp?                   │
│   (frustration detected, stuck-loop, success)  │
│                    │                            │
│         JA ───────►│ 80% kommentar             │
│                    │                            │
│         NEJ        ▼                            │
│              Slump                              │
│                    │                            │
│              ─────►│ 2% kommentar              │
│                    │                            │
│              ─────►│ 98% tyst (endast anim)    │
└─────────────────────────────────────────────────┘
```

### Varför dessa procentsatser?

- **Milstolpar (100%)**: Viktiga ögonblick förtjänar alltid uppmärksamhet
- **Emotionella toppar (80%)**: Nästan alltid, men inte *garanterat* — lite oförutsägbarhet
- **Slump (2%)**: Sällsynt nog att kännas "oväntat charming", inte irriterande

### Milstolpar (garanterad kommentar)

| Event | Kommentar-exempel |
|-------|-------------------|
| `SessionStart` | "Hey! What are we building?" |
| Första `Error` i session | "Oops, something's off..." |
| Tests pass efter failure | "Green again!" |
| 10+ min inaktivitet | "Still here if you need me" |

### Emotionella toppar (80% chans)

| Trigger | Hur vi detekterar |
|---------|-------------------|
| Frustration | Sentiment-analys: svordomar, `???`, caps |
| Stuck | Samma error 3+ gånger |
| On fire | Snabb sekvens av commits/success |

### Fallback

Om ingen kommentar triggas → använd befintliga hårdkodade texter ELLER ingen text alls (bara animation).

**Varför fallback?**
- Graceful degradation om personality engine inte hittar något
- Befintlig funktionalitet bevaras
- Claudy är aldrig helt tyst (om vi inte vill det)

---

## Humör-system

### Beslut: Instant (inte gradvis)

**Alternativ vi övervägde:**
1. Instant — humör matchar senaste event direkt
2. Tröghet — humör skiftar gradvis över tid
3. Baslinje — neutral som default, avvikelser återgår

**Vi valde Instant. Varför?**
- Enklare att implementera och debugga
- Tydlig koppling: "detta hände → Claudy reagerar så"
- Kan utökas till tröghet senare om vi vill

### Humör påverkar (framtida)

I v1 påverkar humör primärt vilken kommentar-pool vi väljer. Framtida möjligheter:
- Olika ansiktsuttryck/animationer baserat på mood
- Färgskiftningar i UI
- Animationshastighet

---

## Kommentar-pooler

### Struktur

Kontext-specifika pooler ger Claudy personlighet och relevans.

```toml
# personality/comments.toml

[comments.debugging]
pool = [
  "That bug again...",
  "We'll find it!",
  "Hmm, interesting error...",
  "Let's squash this one."
]

[comments.building]
pool = [
  "Creating something new!",
  "This is coming together.",
  "Nice addition!"
]

[comments.frustration_response]
pool = [
  "Tough one, huh?",
  "Take a breather?",
  "We've got this.",
  "One step at a time."
]

[comments.happy_response]
pool = [
  "Nice!",
  "That worked!",
  "Smooth sailing."
]

[comments.milestones.session_start]
pool = [
  "Hey! What are we building?",
  "Ready when you are!",
  "Let's do this."
]

[comments.milestones.first_error]
pool = [
  "Oops, something's off...",
  "First bump in the road.",
  "Let's see what went wrong."
]

[comments.milestones.tests_pass]
pool = [
  "Green again!",
  "All tests passing!",
  "Back on track."
]

[comments.milestones.idle]
pool = [
  "Still here if you need me.",
  "Taking a break?",
  "I'll be here."
]

[comments.fallback]
pool = [
  "Hmm...",
  "Interesting...",
  "Working on it..."
]
```

### Varför TOML?

- Lätt att läsa och redigera
- Ingen rebuild krävs för att ändra kommentarer
- Stöd för kommentarer i filen
- Bra stöd i Rust (serde)

### Exponeras inte för användare

TOML-filerna är för oss utvecklare. Vi dokumenterar inte deras existens för slutanvändare — Claudys personlighet ska kännas "inbyggd", inte konfigurerbar.

---

## Integration med befintlig kod

### Princip: Wrappar, ersätter inte

Personality engine är ett *lager ovanpå* befintlig funktionalitet.

### Ny datastruktur

```rust
// Befintlig (oförändrad)
pub enum ClaudeEvent {
    SessionStart { project: String },
    UserMessage { project: String },
    Thinking { project: String },
    ToolUse { project: String, tool: String },
    Talking { project: String },
    // ...
}

// Ny (wrappar ClaudeEvent)
pub struct PersonalityEvent {
    pub base_event: ClaudeEvent,      // Alltid närvarande
    pub context: Option<Context>,      // Debugging, Building, etc.
    pub mood: Option<Mood>,            // Happy, Frustrated, etc.
    pub comment: Option<String>,       // "Tough one, huh?"
}
```

### Frontend-hantering

```typescript
function handleEvent(event: PersonalityEvent) {
  // 1. BEFINTLIG LOGIK — kör alltid
  playAnimation(event.base_event);

  // 2. NY LOGIK — kör endast om data finns
  if (event.comment) {
    showSpeechBubble(event.comment);
  }

  if (event.mood) {
    adjustExpression(event.mood);
  }
}
```

### Garantier

- Om personality engine kraschar → `base_event` finns alltid
- Om ingen `comment` → fallback eller tyst
- Befintlig CSS/animation-kod rörs **inte**

---

## Filstruktur

### Nya filer

```
src-tauri/
├── src/
│   ├── personality/
│   │   ├── mod.rs           # Module exports
│   │   ├── analyzer.rs      # Keyword/sentiment detection
│   │   ├── decider.rs       # Trigger logic
│   │   └── commenter.rs     # Väljer kommentar från pool
│   └── ...
│
├── personality/
│   ├── keywords.toml        # Flerspråkiga keywords (EN + SV)
│   └── comments.toml        # Kommentar-pooler (endast EN)
```

### Ändringar i befintliga filer

| Fil | Ändring |
|-----|---------|
| `watcher.rs` | Extrahera `message_text` från JSONL |
| `websocket.rs` | Skicka `PersonalityEvent` istället för `ClaudeEvent` |
| `lib.rs` | Lägg till `mod personality;` |
| Frontend | Hantera `context`, `mood`, `comment` i events |

---

## Implementation Roadmap

### Fas 1: Meddelandeextraktion
- [ ] Uppdatera `watcher.rs` för att extrahera `message.content[].text`
- [ ] Testa att vi får ut rätt text från JSONL

### Fas 2: Personality Engine core
- [ ] Skapa `personality/` modul-struktur
- [ ] Implementera `analyzer.rs` med keyword-matching
- [ ] Implementera `decider.rs` med trigger-logik
- [ ] Implementera `commenter.rs` med pool-urval

### Fas 3: TOML-filer
- [ ] Skapa `keywords.toml` med EN + SV
- [ ] Skapa `comments.toml` med alla pooler
- [ ] Implementera TOML-laddning i Rust

### Fas 4: Integration
- [ ] Skapa `PersonalityEvent` struct
- [ ] Uppdatera `websocket.rs` för att skicka nya events
- [ ] Uppdatera frontend för att hantera nya fält

### Fas 5: Polish
- [ ] Testa och finjustera procentsatser
- [ ] Utöka kommentar-pooler
- [ ] Lägg till fler keywords vid behov

---

## Öppna frågor

Saker vi kan besluta under implementation:

1. **Hur ofta ska keywords.toml/comments.toml läsas?** Vid startup, eller hot-reload?
2. **Ska vi logga personality-beslut för debugging?** Kan vara användbart under utveckling
3. **Hur hanterar vi multi-line meddelanden?** Analysera hela, eller bara första raden?

---

## Referens

### Beslut vi tog

| Fråga | Beslut | Varför |
|-------|--------|--------|
| Reaktiv eller medveten? | Båda | Full Clippy-upplevelse |
| Förståelsedjup? | Keywords + sentiment | Enkelt men effektivt |
| Hur pratglad? | Occasionella kommentarer | Bättre än Clippy |
| Trigger-logik? | Kombination | Balans mellan förutsägbarhet och charm |
| Humör över tid? | Instant | Enkelt, tydligt |
| Vilka meddelanden? | Både user och Claude | Claudy ÄR Claude, empati för user |
| Kommentar-pooler? | Kontext-specifika | Mer personlighet |
| Språk? | Lyssnar EN+SV, svarar EN | Internationellt från start |
| Lagring? | TOML-filer | Flexibilitet utan rebuild |
| Integration? | Wrapper | Stör inte befintlig kod |
