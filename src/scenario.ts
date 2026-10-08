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
        move: (x: number, y: number): void => {
            this.steps.push({ label: `Move pointer to ${x}, ${y}`, run: async (_page, pointer) => pointer.move(x, y) });
        },
        fadeIn: (): void => {
            this.steps.push({ label: "Fade in pointer", run: async (_page, pointer) => pointer.fadeIn() });
        },
        fadeOut: (): void => {
            this.steps.push({ label: "Fade out pointer", run: async (_page, pointer) => pointer.fadeOut() });
        },
        goto: (selector: string): void => {
            this.steps.push({ label: `Move pointer to ${selector}`, run: async (_page, pointer) => pointer.goto(selector) });
        },
        click: (): void => {
            this.steps.push({ label: "Click pointer target", run: async (_page, pointer) => pointer.click() });
        },
    };

    readonly scroll = {
        intoView: (selector: string, alignment = 0.5): void => {
            if (!Number.isFinite(alignment) || alignment < 0 || alignment > 1) {
                throw new RangeError("Scroll alignment must be between 0 and 1");
            }
            this.steps.push({
                label: `Scroll ${selector} into view at ${alignment}`,
                run: async (page) => {
                    const target = page.locator(selector).filter({ visible: true }).first();
                    await target.waitFor({ state: "visible" });
                    await target.evaluate(async (element, position) => {
                        const containers: Element[] = [];
                        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                            const overflow = getComputedStyle(parent).overflowY;
                            if (/(auto|scroll|overlay)/.test(overflow) && parent.scrollHeight > parent.clientHeight) {
                                containers.push(parent);
                            }
                        }
                        const documentScroller = document.scrollingElement;
                        if (documentScroller && !containers.includes(documentScroller)) containers.push(documentScroller);
                        for (const container of containers) {
                            const viewport = container === documentScroller;
                            const rect = element.getBoundingClientRect();
                            const containerRect = viewport ? { top: 0, height: innerHeight } : container.getBoundingClientRect();
                            const start = container.scrollTop;
                            const desired = start + rect.top - containerRect.top - position * (containerRect.height - rect.height);
                            const end = Math.max(0, Math.min(desired, container.scrollHeight - container.clientHeight));
                            if (Math.abs(end - start) < 1) continue;
                            await new Promise<void>((resolve) => {
                                const began = performance.now();
                                const frame = (now: number) => {
                                    const progress = Math.min((now - began) / 750, 1);
                                    const eased = progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
                                    container.scrollTo({ top: start + (end - start) * eased, behavior: "instant" });
                                    if (progress < 1) requestAnimationFrame(frame);
                                    else resolve();
                                };
                                requestAnimationFrame(frame);
                            });
                        }
                    }, alignment);
                },
            });
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
