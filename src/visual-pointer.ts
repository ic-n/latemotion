import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

const cursorPath = fileURLToPath(new URL("../assets/cursor.png", import.meta.url));
const pointerPath = fileURLToPath(new URL("../assets/pointer.png", import.meta.url));

export class VisualPointer {
  private readonly page: Page;
  private target: Locator | undefined;
  private position = { x: 0.5, y: 0.5 };
  private readonly assets: Promise<{ cursor: string; pointer: string }>;

  constructor(page: Page) {
    this.page = page;
    this.assets = Promise.all([readFile(cursorPath), readFile(pointerPath)]).then(
      ([cursor, pointer]) => ({
        cursor: `data:image/png;base64,${cursor.toString("base64")}`,
        pointer: `data:image/png;base64,${pointer.toString("base64")}`,
      }),
    );
  }

  async start(x: number, y: number): Promise<void> {
    if (![x, y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
      throw new RangeError("Pointer coordinates must be between 0 and 1");
    }
    this.position = { x, y };
    const assets = await this.assets;
    await this.page.evaluate(({ cursor, x, y }) => {
      let image = document.getElementById("latemotion-pointer") as HTMLImageElement | null;
      if (!image) {
        image = document.createElement("img");
        image.id = "latemotion-pointer";
        image.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;width:32px;height:32px;object-fit:contain;left:0;top:0;transition:none";
        document.documentElement.append(image);
      }
      image.src = cursor;
      image.style.left = `${x * window.innerWidth}px`;
      image.style.top = `${y * window.innerHeight}px`;
    }, { cursor: assets.cursor, x, y });
  }

  async goto(selector: string): Promise<void> {
    const locator = this.page.locator(selector).filter({ visible: true }).first();
    await locator.scrollIntoViewIfNeeded();
    const bounds = await locator.boundingBox();
    if (!bounds) {
      throw new Error(`Pointer target is not visible: ${selector}`);
    }
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const assets = await this.assets;
    await this.start(this.position.x, this.position.y);
    await this.page.evaluate(async ({ x, y, cursor, pointer }) => {
      const image = document.getElementById("latemotion-pointer") as HTMLImageElement;
      image.style.transition = "left 650ms ease-in-out, top 650ms ease-in-out";
      image.style.left = `${x}px`;
      image.style.top = `${y}px`;
      await new Promise<void>((resolve) => window.setTimeout(resolve, 700));
      const element = document.elementFromPoint(x, y);
      const interactive = element?.closest("a,button,[role='button'],input,select,textarea");
      image.src = interactive || (element && getComputedStyle(element).cursor === "pointer") ? pointer : cursor;
    }, { x, y, ...assets });
    await locator.hover();
    this.position = { x: x / this.page.viewportSize()!.width, y: y / this.page.viewportSize()!.height };
    this.target = locator;
  }

  async click(): Promise<void> {
    if (!this.target) {
      throw new Error("Move the pointer to a target before clicking");
    }
    await this.target.click();
  }
}
