import { Rive, StateMachineInput } from "@rive-app/canvas";

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
  private rive: Rive | null = null;
  private stateInput: StateMachineInput | null = null;

  async init(canvas: HTMLCanvasElement, rivFile: string) {
    this.rive = new Rive({
      src: rivFile,
      canvas: canvas,
      autoplay: true,
      stateMachines: "State Machine 1",
      onLoad: () => {
        this.stateInput = this.rive?.stateMachineInputs("State Machine 1")
          ?.find(input => input.name === "state") || null;
        this.setState("idle");
      },
    });
  }

  setState(state: ClaudyState) {
    if (!this.stateInput) return;

    const stateMap: Record<ClaudyState, number> = {
      idle: 0,
      wake: 1,
      listening: 2,
      thinking: 3,
      working: 4,
      happy: 5,
      confused: 6,
      sleepy: 7,
    };

    this.stateInput.value = stateMap[state];
  }

  destroy() {
    this.rive?.cleanup();
  }
}
