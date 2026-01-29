export type ClaudyState =
  | "intro"
  | "idle"
  | "wake"
  | "listening"
  | "thinking"
  | "working"
  | "talking"
  | "happy"
  | "confused"
  | "sleepy";

const ONE_SHOT_STATES: ClaudyState[] = ["intro", "wake", "talking", "happy", "confused"];

// Minimum duration for talking state (2 loops × 0.6s = 1.2s)
const TALKING_MIN_DURATION = 1200;

// States that should wait for talking to finish (everything except listening/wake which need immediate response)
const STATES_THAT_WAIT_FOR_TALKING: ClaudyState[] = ["happy", "confused", "idle", "working", "thinking", "sleepy"];

export type StateChangeCallback = (state: ClaudyState) => void;

export class ClaudyAnimation {
  private container: HTMLElement | null = null;
  private currentState: ClaudyState = "idle";
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isPlayingBreathing: boolean = false;
  private onStateChange: StateChangeCallback | null = null;
  private talkingStartTime: number = 0;
  private queuedState: ClaudyState | null = null;
  private queuedStateTimer: ReturnType<typeof setTimeout> | null = null;
  private elements: {
    wrapper: HTMLElement;
    body: HTMLImageElement;
    eyes: HTMLImageElement;
    legs: HTMLImageElement;
    claws: HTMLImageElement;
  } | null = null;

  constructor(private basePath: string = "/claudy-parts") {}

  setOnStateChange(callback: StateChangeCallback) {
    this.onStateChange = callback;
  }

  init(container: HTMLElement, playIntro: boolean = true) {
    this.container = container;
    this.createDOM();

    if (playIntro) {
      this.setState("intro");
    } else {
      this.setState("idle");
    }
  }

  private createDOM() {
    if (!this.container) return;

    // Clear container
    this.container.innerHTML = "";

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "claudy-wrapper";

    // Create sprite elements (render order: back to front)
    const legs = this.createSprite("legs");
    const body = this.createSprite("body");
    const claws = this.createSprite("claws");
    const eyes = this.createSprite("eyes");

    wrapper.appendChild(legs);
    wrapper.appendChild(body);
    wrapper.appendChild(claws);
    wrapper.appendChild(eyes);

    this.container.appendChild(wrapper);

    this.elements = { wrapper, body, eyes, legs, claws };

    // Listen for animation end on wrapper (for one-shot states)
    wrapper.addEventListener("animationend", (e) => {
      // Only handle wrapper-level animations (one-shot states)
      const wrapperAnimations = [
        "claudy-intro-container",
        "claudy-wake",
        "claudy-talking-body",
        "claudy-happy",
        "claudy-confused"
      ];
      if (wrapperAnimations.includes(e.animationName)) {
        this.handleAnimationEnd();
      }
    });

    // Listen for breathing animation end on eyes
    eyes.addEventListener("animationend", () => {
      if (this.isPlayingBreathing) {
        this.isPlayingBreathing = false;
        this.applyState("idle");
        this.startIdleTimer();
      }
    });
  }

  private createSprite(name: string): HTMLImageElement {
    const img = document.createElement("img");
    img.src = `${this.basePath}/${name}.png`;
    img.className = `claudy-sprite claudy-${name}`;
    img.alt = "";
    img.draggable = false;
    return img;
  }

  private handleAnimationEnd() {
    if (ONE_SHOT_STATES.includes(this.currentState)) {
      this.currentState = "idle";
      this.applyState("idle");
      this.startIdleTimer();
      this.onStateChange?.("idle");
    }
  }

  private startIdleTimer() {
    this.stopIdleTimer();
    // Random interval between 10-15 seconds
    const delay = 10000 + Math.random() * 5000;
    this.idleTimer = setTimeout(() => this.playBreathingIdle(), delay);
  }

  private stopIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private playBreathingIdle() {
    if (!this.elements || this.currentState !== "idle") return;

    this.isPlayingBreathing = true;
    this.applyState("breathing");
  }

  private applyState(state: ClaudyState | "breathing") {
    if (!this.elements) return;

    const { wrapper } = this.elements;

    // Remove all state classes
    wrapper.className = "claudy-wrapper";

    // Force reflow to restart animations
    void wrapper.offsetWidth;

    // Add new state class
    wrapper.classList.add(`claudy-state-${state}`);
  }

  setState(state: ClaudyState) {
    console.log("[ClaudyAnimation] setState called:", state, "current:", this.currentState);

    // Allow interrupting breathing animation
    if (state === this.currentState && !this.isPlayingBreathing) {
      console.log("[ClaudyAnimation] Ignoring duplicate state");
      return;
    }

    // If going from thinking directly to happy/confused, inject talking first
    // (Claude Code doesn't always write text as separate JSONL line for short responses)
    if ((state === "happy" || state === "confused") && this.currentState === "thinking") {
      console.log("[ClaudyAnimation] Injecting talking before", state);
      this.applyStateInternal("talking");
      // Queue the completion state
      this.queuedState = state;
      if (this.queuedStateTimer) {
        clearTimeout(this.queuedStateTimer);
      }
      this.queuedStateTimer = setTimeout(() => {
        if (this.queuedState) {
          const queued = this.queuedState;
          this.queuedState = null;
          this.queuedStateTimer = null;
          this.applyStateInternal(queued);
        }
      }, TALKING_MIN_DURATION);
      return;
    }

    // If currently in talking state, check if minimum duration has passed
    if (this.currentState === "talking") {
      const elapsed = Date.now() - this.talkingStartTime;
      console.log("[ClaudyAnimation] In talking, elapsed:", elapsed, "ms, incoming:", state);
      if (elapsed < TALKING_MIN_DURATION && STATES_THAT_WAIT_FOR_TALKING.includes(state)) {
        // Queue this state for later
        console.log("[ClaudyAnimation] Queueing state:", state);
        this.queuedState = state;

        // Set timer to apply queued state after remaining time
        if (this.queuedStateTimer) {
          clearTimeout(this.queuedStateTimer);
        }
        const remaining = TALKING_MIN_DURATION - elapsed;
        this.queuedStateTimer = setTimeout(() => {
          if (this.queuedState) {
            const queued = this.queuedState;
            this.queuedState = null;
            this.queuedStateTimer = null;
            this.applyStateInternal(queued);
          }
        }, remaining);
        return;
      }
    }

    // If talking arrives while in happy/confused/idle (wrong order from JSONL),
    // switch to talking first and queue the current state to play after
    // Only queue completion states, not activity states like thinking/working
    const STATES_TO_REQUEUE: ClaudyState[] = ["happy", "confused", "idle"];
    if (state === "talking" && STATES_TO_REQUEUE.includes(this.currentState)) {
      const previousState = this.currentState;
      this.applyStateInternal("talking");

      // Queue the previous state (happy/confused/idle) to play after talking
      this.queuedState = previousState;
      if (this.queuedStateTimer) {
        clearTimeout(this.queuedStateTimer);
      }
      this.queuedStateTimer = setTimeout(() => {
        if (this.queuedState) {
          const queued = this.queuedState;
          this.queuedState = null;
          this.queuedStateTimer = null;
          this.applyStateInternal(queued);
        }
      }, TALKING_MIN_DURATION);
      return;
    }

    this.applyStateInternal(state);
  }

  private applyStateInternal(state: ClaudyState) {
    console.log("[ClaudyAnimation] applyStateInternal:", state);
    this.isPlayingBreathing = false;
    this.stopIdleTimer();

    // Clear any queued state
    this.queuedState = null;
    if (this.queuedStateTimer) {
      clearTimeout(this.queuedStateTimer);
      this.queuedStateTimer = null;
    }

    this.currentState = state;

    // Track when talking starts
    if (state === "talking") {
      this.talkingStartTime = Date.now();
    }

    this.applyState(state);

    // Start idle timer if entering idle state
    if (state === "idle") {
      this.startIdleTimer();
    }
  }

  destroy() {
    this.stopIdleTimer();
    if (this.container) {
      this.container.innerHTML = "";
    }
    this.elements = null;
  }
}
