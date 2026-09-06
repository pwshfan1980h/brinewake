import { neutralInput, type Input } from "../sim/types";
const edges = [
  "jumpPressed",
  "dashPressed",
  "missilePressed",
  "repairPressed",
] as const;
/** Render input may arrive faster than fixed ticks. Edges survive until consumed once. */
export class InputBuffer {
  value = neutralInput();
  push(input: Input) {
    const previous = this.value;
    this.value = { ...input };
    for (const key of edges) this.value[key] ||= previous[key];
  }
  consume() {
    const result = { ...this.value };
    for (const key of edges) this.value[key] = false;
    return result;
  }
  clear() {
    this.value = neutralInput();
  }
}
