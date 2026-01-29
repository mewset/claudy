import lottie, { AnimationItem } from "lottie-web";

export type ClaudyState =
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

  constructor(basePath: string = "/animations") {
    // Each state has its own Lottie JSON file
    this.animationPaths = {
      idle: `${basePath}/idle.json`,
      wake: `${basePath}/wake.json`,
      listening: `${basePath}/listening.json`,
      thinking: `${basePath}/thinking.json`,
      working: `${basePath}/working.json`,
      happy: `${basePath}/happy.json`,
      confused: `${basePath}/confused.json`,
      sleepy: `${basePath}/sleepy.json`,
    };
  }

  init(container: HTMLElement) {
    this.container = container;
    this.loadAnimation("idle", true);
  }

  private loadAnimation(state: ClaudyState, loop: boolean = true) {
    if (!this.container) return;

    // Destroy previous animation
    if (this.currentAnimation) {
      this.currentAnimation.destroy();
    }

    // Load new animation
    this.currentAnimation = lottie.loadAnimation({
      container: this.container,
      renderer: "svg",
      loop: loop,
      autoplay: true,
      path: this.animationPaths[state],
    });

    this.currentState = state;

    // For one-shot animations (wake, happy, confused), return to idle after
    if (!loop) {
      this.currentAnimation.addEventListener("complete", () => {
        this.loadAnimation("idle", true);
      });
    }
  }

  setState(state: ClaudyState) {
    if (state === this.currentState) return;

    // Determine if this is a looping or one-shot state
    const oneShotStates: ClaudyState[] = ["wake", "happy", "confused"];
    const isOneShot = oneShotStates.includes(state);

    this.loadAnimation(state, !isOneShot);
  }

  destroy() {
    if (this.currentAnimation) {
      this.currentAnimation.destroy();
      this.currentAnimation = null;
    }
  }
}
