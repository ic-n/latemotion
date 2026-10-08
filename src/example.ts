import type { Scenario } from "./scenario.ts";

export const scenario: Scenario = (r) => {
  r.wait(2000);
  r.pointer.start(0.5, 0.5);
  r.pointer.goto('a[href="/about/"]');
  r.pointer.click();
  r.wait(20_000);
};
