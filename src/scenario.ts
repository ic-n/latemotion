import type { Page } from "@playwright/test";
import { VisualPointer } from "./visual-pointer.ts";

export type Scenario = (runner: ScenarioRunner) => void;

type Step = { label: string; run: (page: Page, pointer: VisualPointer) => Promise<void> };

export class ScenarioRunner {
    readonly steps: Step[] = [];

    readonly pointer = {
        start: (x: number, y: number): void => {
            this.steps.push({ label: `Position pointer at ${x}, ${y}`, run: async (_page, pointer) => pointer.start(x, y) });
        },
        goto: (selector: string): void => {
            this.steps.push({ label: `Move pointer to ${selector}`, run: async (_page, pointer) => pointer.goto(selector) });
        },
        click: (): void => {
            this.steps.push({ label: "Click pointer target", run: async (_page, pointer) => pointer.click() });
        },
    };

    wait(milliseconds: number): void {
        if (!Number.isFinite(milliseconds) || milliseconds < 0) {
            throw new RangeError("Wait duration must be a nonnegative finite number");
        }
        this.steps.push({ label: `Wait ${milliseconds} ms`, run: async (page) => page.waitForTimeout(milliseconds) });
    }
}

export function defineScenario(scenario: Scenario): ScenarioRunner {
    const runner = new ScenarioRunner();
    scenario(runner);
    return runner;
}
