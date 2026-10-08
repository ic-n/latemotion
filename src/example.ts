import type { Page } from "@playwright/test";
import type { Scenario } from "./scenario.ts";

export const before = async (page: Page) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto("https://flipgo.tv");
};

export const scenario: Scenario = (r) => {
    r.wait(500);
    r.pointer.fadeOut();
    r.pointer.start(0.5, 0.5);
    r.pointer.fadeIn();
    r.pointer.goto('a[href="/about/"]');
    r.pointer.click();
    r.pointer.fadeOut();
    r.wait(2000);
    r.scroll.intoView("footer", 1);
    r.wait(1000);
    r.scroll.intoView("header", 0);
    r.wait(1000);
};
