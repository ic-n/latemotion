import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { Locator, Page } from "@playwright/test";

const cursorPath = fileURLToPath(new URL("../assets/cursor.png", import.meta.url));
const pointerPath = fileURLToPath(new URL("../assets/pointer.png", import.meta.url));

type FocusState = {
    element: HTMLElement;
    animation: Animation;
    position: string;
    zIndex: string;
    transformOrigin: string;
};

type MotionWindow = Window & { lateMotionFocus?: FocusState };

export class VisualPointer {
    private readonly page: Page;
    private target: Locator | undefined;
    private position = { x: 0.5, y: 0.5 };
    private readonly assets: Promise<{ cursor: string; pointer: string }>;

    constructor(page: Page) {
        this.page = page;
        this.assets = Promise.all([readFile(cursorPath), readFile(pointerPath)]).then(([cursor, pointer]) => ({
            cursor: `data:image/png;base64,${cursor.toString("base64")}`,
            pointer: `data:image/png;base64,${pointer.toString("base64")}`,
        }));
    }

    private async clearFocus(): Promise<void> {
        await this.page.evaluate(async () => {
            const focus = (window as MotionWindow).lateMotionFocus;
            const blur = document.getElementById("latemotion-blur");
            const vignette = document.getElementById("latemotion-vignette");
            const overlays = [blur, vignette].filter((node): node is HTMLElement => node instanceof HTMLElement);
            await Promise.all(overlays.map((node) =>
                node.animate([{ opacity: getComputedStyle(node).opacity }, { opacity: 0 }], { duration: 320, fill: "forwards" }).finished.catch(() => undefined),
            ));
            for (const node of overlays) node.remove();
            if (focus) {
                focus.animation.cancel();
                focus.element.style.position = focus.position;
                focus.element.style.zIndex = focus.zIndex;
                focus.element.style.transformOrigin = focus.transformOrigin;
                delete (window as MotionWindow).lateMotionFocus;
            }
        });
    }

    async start(x: number, y: number): Promise<void> {
        if (![x, y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
            throw new RangeError("Pointer coordinates must be between 0 and 1");
        }
        await this.clearFocus();
        this.position = { x, y };
        this.target = undefined;
        const assets = await this.assets;
        await this.page.evaluate(
            ({ cursor, x, y }) => {
                let image = document.getElementById("latemotion-pointer") as HTMLImageElement | null;
                if (!image) {
                    image = document.createElement("img");
                    image.id = "latemotion-pointer";
                    image.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;width:32px;height:44px;object-fit:contain;left:0;top:0;filter:drop-shadow(0 5px 6px rgb(0 0 0 / .35))";
                    document.documentElement.append(image);
                }
                image.getAnimations().forEach((animation) => animation.cancel());
                image.src = cursor;
                image.style.opacity = "1";
                image.style.transform = `translate3d(${x * innerWidth}px, ${y * innerHeight}px, 0)`;
            },
            { cursor: assets.cursor, x, y },
        );
    }

    async move(x: number, y: number): Promise<void> {
        if (![x, y].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
            throw new RangeError("Pointer coordinates must be between 0 and 1");
        }
        await this.start(this.position.x, this.position.y);
        await this.page.evaluate(async ({ x, y }) => {
            const image = document.getElementById("latemotion-pointer") as HTMLImageElement;
            const destination = `translate3d(${x * innerWidth}px, ${y * innerHeight}px, 0)`;
            const travel = image.animate(
                [{ transform: image.style.transform }, { transform: destination }],
                { duration: 650, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" },
            );
            await travel.finished;
            image.style.transform = destination;
            travel.cancel();
        }, { x, y });
        this.position = { x, y };
    }

    async goto(selector: string): Promise<void> {
        const locator = this.page.locator(selector).filter({ visible: true }).first();
        await locator.scrollIntoViewIfNeeded();
        const bounds = await locator.boundingBox();
        if (!bounds) throw new Error(`Pointer target is not visible: ${selector}`);
        const x = bounds.x + bounds.width / 2;
        const y = bounds.y + bounds.height / 2;
        await this.clearFocus();
        const assets = await this.assets;
        await this.page.evaluate(
            async ({ x, y, previousX, previousY, cursor, pointer }) => {
                let image = document.getElementById("latemotion-pointer") as HTMLImageElement | null;
                if (!image) {
                    image = document.createElement("img");
                    image.id = "latemotion-pointer";
                    image.style.cssText = "position:fixed;z-index:2147483647;pointer-events:none;width:32px;height:44px;object-fit:contain;left:0;top:0;filter:drop-shadow(0 5px 6px rgb(0 0 0 / .35))";
                    document.documentElement.append(image);
                    image.style.transform = `translate3d(${previousX * innerWidth}px, ${previousY * innerHeight}px, 0)`;
                }
                image.getAnimations().forEach((animation) => animation.cancel());
                image.src = cursor;
                image.style.opacity = "1";
                const travel = image.animate(
                    [{ transform: image.style.transform }, { transform: `translate3d(${x}px, ${y}px, 0)` }],
                    { duration: 650, easing: "cubic-bezier(.65, 0, .35, 1)", fill: "forwards" },
                );
                await travel.finished;
                image.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                travel.cancel();
                image.src = pointer;
            },
            { x, y, previousX: this.position.x, previousY: this.position.y, ...assets },
        );
        await locator.hover();
        await locator.evaluate(async (element) => {
            if (!(element instanceof HTMLElement)) throw new Error("Pointer focus requires an HTML element");
            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const radiusX = Math.max(210, rect.width);
            const radiusY = Math.max(120, rect.height);
            const blur = document.createElement("div");
            blur.id = "latemotion-blur";
            blur.style.cssText = `position:fixed;inset:0;z-index:2147483644;pointer-events:none;background:rgb(3 9 7 / .1);backdrop-filter:blur(6px) saturate(.82);mask-image:radial-gradient(ellipse ${radiusX}px ${radiusY}px at ${centerX}px ${centerY}px,transparent 72%,black 100%);opacity:0`;
            const vignette = document.createElement("div");
            vignette.id = "latemotion-vignette";
            vignette.style.cssText = `position:fixed;inset:0;z-index:2147483645;pointer-events:none;background:radial-gradient(ellipse ${radiusX}px ${radiusY}px at ${centerX}px ${centerY}px,transparent 72%,rgb(3 9 7 / .68) 100%);opacity:0`;
            document.documentElement.append(blur, vignette);
            const computed = getComputedStyle(element);
            const baseTransform = computed.transform === "none" ? "" : computed.transform;
            const baseFilter = computed.filter === "none" ? "" : computed.filter;
            const baseShadow = computed.boxShadow === "none" ? "" : computed.boxShadow;
            const original = { position: element.style.position, zIndex: element.style.zIndex, transformOrigin: element.style.transformOrigin };
            if (computed.position === "static") element.style.position = "relative";
            element.style.zIndex = "2147483646";
            element.style.transformOrigin = "center";
            const animation = element.animate(
                [
                    { transform: baseTransform, filter: baseFilter, boxShadow: baseShadow },
                    { transform: `${baseTransform} translate3d(0,-1px,0) scale(1.05)`, filter: `${baseFilter} brightness(1.045)`, boxShadow: "0 38px 96px rgb(0 0 0 / .42), 0 12px 32px rgb(0 0 0 / .25)" },
                ],
                { duration: 650, easing: "cubic-bezier(.16, 1, .3, 1)", fill: "forwards" },
            );
            (window as MotionWindow).lateMotionFocus = { element, animation, ...original };
            await Promise.all([
                animation.finished,
                blur.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 550, fill: "forwards" }).finished,
                vignette.animate([{ opacity: 0 }, { opacity: .72 }], { duration: 550, fill: "forwards" }).finished,
            ]);
            await new Promise<void>((resolve) => setTimeout(resolve, 300));
        });
        const viewport = this.page.viewportSize();
        this.position = { x: x / (viewport?.width ?? await this.page.evaluate(() => innerWidth)), y: y / (viewport?.height ?? await this.page.evaluate(() => innerHeight)) };
        this.target = locator;
    }

    async click(): Promise<void> {
        if (!this.target) throw new Error("Move the pointer to a target before clicking");
        try {
            await this.target.evaluate(async (element) => {
                const image = document.getElementById("latemotion-pointer");
                await Promise.all([
                    element.animate([{ scale: "1" }, { scale: ".97", offset: .45 }, { scale: "1" }], { duration: 240, easing: "ease-in-out" }).finished,
                    image?.animate([{ scale: "1" }, { scale: ".84", offset: .45 }, { scale: "1" }], { duration: 240, easing: "ease-in-out" }).finished,
                ]);
            });
            await this.target.click();
        } finally {
            await this.clearFocus().catch(() => undefined);
            this.target = undefined;
        }
    }
}
