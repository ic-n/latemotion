import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { scenario } from "./example.ts";
import { defineScenario } from "./scenario.ts";
import { VisualPointer } from "./visual-pointer.ts";

const viewport = { width: 1280, height: 720 };
const tracePath = "logs/trace.txt";

async function waitForPlaybackKey(context: BrowserContext, page: Page): Promise<void> {
  let resolveStart: (() => void) | undefined;
  const pressed = new Promise<void>((resolve) => { resolveStart = resolve; });
  await context.exposeBinding("lateMotionStart", () => resolveStart?.());
  await context.addInitScript(() => {
    window.addEventListener("keydown", (event) => {
      if (event.key.toLowerCase() === "p" && !event.repeat) {
        void (window as Window & { lateMotionStart?: () => Promise<void> }).lateMotionStart?.();
      }
    });
  });
  await page.goto("https://flipgo.tv");
  console.log("Browser ready. Focus the browser and press P when you want the scenario to play.");
  await pressed;
}

async function run(): Promise<void> {
  let phase = "Launch browser";
  let currentStep = "";
  let browser: Browser | undefined;
  let context: BrowserContext | undefined;
  try {
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({ viewport });
    const page = await context.newPage();
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
    const details = [
      `Time: ${new Date().toISOString()}`,
      `Phase: ${phase}`,
      currentStep ? `Step: ${currentStep}` : "",
      `Error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`,
    ].filter(Boolean).join("\n");
    await writeFile(tracePath, `${details}\n`);
    console.error(`Scenario failed. Details: ${tracePath}`);
    throw error;
  } finally {
    await context?.close();
    await browser?.close();
  }
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
