import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { before, scenario } from "./example.ts";
import { defineScenario } from "./scenario.ts";
import { VisualPointer } from "./visual-pointer.ts";

const tracePath = "logs/trace.txt";

async function waitForPlaybackKey(context: BrowserContext, page: Page): Promise<void> {
    let resolveStart: (() => void) | undefined;
    const pressed = new Promise<void>((resolve) => {
        resolveStart = resolve;
    });
    await context.exposeBinding("lateMotionStart", () => resolveStart?.());
    const installPlaybackKey = () => {
        window.addEventListener("keydown", (event) => {
            if (event.key.toLowerCase() === "p" && !event.repeat) {
                void (window as Window & { lateMotionStart?: () => Promise<void> }).lateMotionStart?.();
            }
        });
    };
    await context.addInitScript(installPlaybackKey);
    await page.evaluate(installPlaybackKey);
    console.log("Browser ready. Focus the browser and press P when you want the scenario to play.");
    await pressed;
}

async function run(): Promise<void> {
    let phase = "Prepare browser profile";
    let currentStep = "";
    let context: BrowserContext | undefined;
    try {
        const profilePath = resolve(".latemotion/profiles/main");
        await mkdir(profilePath, { recursive: true });
        phase = "Launch browser";
        context = await chromium.launchPersistentContext(profilePath, { headless: false, viewport: null });
        if (process.argv[2] === "open") {
            console.log("Browser ready. Close the browser window when you are done.");
            const openContext = context;
            await new Promise<void>((resolve) => openContext.once("close", () => resolve()));
            context = undefined;
            return;
        }
        const page = context.pages()[0] ?? (await context.newPage());
        phase = "Scenario setup";
        await before(page);
        phase = "Manual preparation";
        await waitForPlaybackKey(context, page);

        const steps = defineScenario(scenario).steps;
        const pointer = new VisualPointer(page);
        phase = "Scenario playback";
        console.log(`Playing scenario: ${steps.length} steps`);
        for (const [index, step] of steps.entries()) {
            currentStep = `${index + 1}/${steps.length} ${step.label}`;
            console.log(`→ ${currentStep}`);
            await step.run(page, pointer);
            console.log(`✓ ${currentStep}`);
        }

        phase = "Close browser context";
        await context.close();
        context = undefined;
        console.log("Scenario passed.");
    } catch (error) {
        await mkdir("logs", { recursive: true });
        const details = [`Time: ${new Date().toISOString()}`, `Phase: ${phase}`, currentStep ? `Step: ${currentStep}` : "", `Error: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`].filter(Boolean).join("\n");
        await writeFile(tracePath, `${details}\n`);
        console.error(`Scenario failed. Details: ${tracePath}`);
        throw error;
    } finally {
        await context?.close();
    }
}

run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
