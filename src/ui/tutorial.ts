import type { Input, Player } from "../sim/types";
export const tutorialSteps = [
  [
    "Locomotion online",
    "A / D to move. Your weapon tracks the pointer independently.",
    "Left stick to move. Right stick to aim.",
  ],
  [
    "Clear the breakwater",
    "Tap Space to jump. Hold it for jet thrust. W is an alias on land.",
    "LB to jump; hold for jet thrust. Keep both thumbs on the sticks.",
  ],
  [
    "Rivet repeater",
    "Hold right mouse to fire. Track the reticle while moving.",
    "Hold RT to fire. Aim with the right stick while moving.",
  ],
  [
    "Sealed arc lance",
    "Hold left mouse to charge, then release a precision pulse.",
    "Hold LT to charge, then release a precision pulse.",
  ],
  [
    "Wake pods",
    "Press E to launch guided pods. They recharge automatically.",
    "Press B / right face for guided pods. They recharge automatically.",
  ],
  [
    "Surge drive",
    "Press Shift with a direction. The drive recharges in a second.",
    "Press RB with a direction to surge.",
  ],
  [
    "Field patch",
    "Press Q. Keep clear of fire for the repair windup.",
    "Press Y / top face. Incoming damage interrupts the patch.",
  ],
  [
    "A sealed hull",
    "Enter the water ahead. WASD swims; Space rises; Shift surges. No oxygen timer.",
    "Enter the water ahead. Left stick swims in two dimensions; LB rises.",
  ],
  [
    "Restore the route",
    "Clear the relay at 52 m, then hold F beside it. H opens your field guide.",
    "Clear the relay at 52 m, then hold X / left face beside it. View opens the guide.",
  ],
];
export class Tutorial {
  step = 0;
  done = false;
  seen = new Set<string>();
  update(p: Player, i: Input, objectiveDone: boolean) {
    if (this.done) return;
    if (Math.abs(i.moveX) > 0.2) this.seen.add("move");
    if (i.jump && p.y > 2) this.seen.add("jump");
    if (i.primary) this.seen.add("primary");
    if (i.secondary) this.seen.add("charge");
    if (!i.secondary && this.seen.has("charge")) this.seen.add("arc");
    if (i.missilePressed) this.seen.add("pod");
    if (i.dashPressed) this.seen.add("dash");
    if (i.repairPressed) this.seen.add("repair");
    if (p.water === "submerged") this.seen.add("water");
    if (objectiveDone) this.seen.add("objective");
    const keys = [
      "move",
      "jump",
      "primary",
      "arc",
      "pod",
      "dash",
      "repair",
      "water",
      "objective",
    ];
    if (this.seen.has(keys[this.step])) {
      this.step++;
      if (this.step >= keys.length) this.done = true;
    }
  }
  skip() {
    this.done = true;
  }
}
