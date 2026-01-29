import lottie, { AnimationItem } from "lottie-web";

export type ClaudyState =
  | "intro"
  | "idle"
  | "wake"
  | "listening"
  | "thinking"
  | "working"
  | "happy"
  | "confused"
  | "sleepy";

export class ClaudyAnimation {
  private container: HTMLElement | null = null;
  private currentAnimation: AnimationItem | null = null;
  private currentState: ClaudyState = "idle";
  private animationPaths: Record<ClaudyState, string>;
  private breathingIdlePath: string;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isPlayingBreathing: boolean = false;

  constructor(basePath: string = "/animations") {
    // Each state is a Lottie JSON-animation
    this.animationPaths = {
      intro: `${basePath}/intro.json`,
      idle: `${basePath}/idle.json`,
      wake: `${basePath}/wake.json`,
      listening: `${basePath}/listening.json`,
      thinking: `${basePath}/thinking.json`,
      working: `${basePath}/working.json`,
      happy: `${basePath}/happy.json`,
      confused: `${basePath}/confused.json`,
      sleepy: `${basePath}/sleepy.json`,
    };
    this.breathingIdlePath = `${basePath}/breathing-idle.json`;
  }

  init(container: HTMLElement, playIntro: boolean = true) {
    this.container = container;
    if (playIntro) {
      this.loadAnimation("intro", false);
    } else {
      this.loadAnimation("idle", true);
    }
  }

  private loadAnimation(state: ClaudyState, loop: boolean = true) {
    if (!this.container) return;

    // Destroy previous animation
    if (this.currentAnimation) {
      this.currentAnimation.destroy();
    }

    // Load and play new animation
    this.currentAnimation = lottie.loadAnimation({
      container: this.container,
      renderer: "svg",
      loop: loop,
      autoplay: true,
      path: this.animationPaths[state],
    });

    this.currentState = state;

    // For one-shot animations, return to idle after
    if (!loop) {
      newAnimation.addEventListener("complete", () => {
        this.loadAnimation("idle", true);
      });
    }

    // Start/stop idle breathing timer based on state
    if (state === "idle") {
      this.startIdleTimer();
    } else {
      this.stopIdleTimer();
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
    if (!this.container || this.currentState !== "idle") return;

    this.isPlayingBreathing = true;

    // Destroy current idle
    if (this.currentAnimation) {
      this.currentAnimation.destroy();
    }

    // Load breathing animation
    this.currentAnimation = lottie.loadAnimation({
      container: this.container,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: this.breathingIdlePath,
    });

    this.currentAnimation.addEventListener("complete", () => {
      this.isPlayingBreathing = false;
      // Return to regular idle and restart timer
      if (this.currentState === "idle") {
        this.loadAnimation("idle", true);
      }
    });
  }

  setState(state: ClaudyState) {
    // Allow interrupting breathing animation
    if (state === this.currentState && !this.isPlayingBreathing) return;

    this.isPlayingBreathing = false;

    // Determine if this is a looping or one-shot state
    const oneShotStates: ClaudyState[] = ["intro", "wake", "happy", "confused"];
    const isOneShot = oneShotStates.includes(state);

    this.loadAnimation(state, !isOneShot);
  }

  destroy() {
    this.stopIdleTimer();
    if (this.currentAnimation) {
      this.currentAnimation.destroy();
      this.currentAnimation = null;
    }
  }
}
