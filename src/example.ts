import type { Page } from "@playwright/test";
import type { Scenario } from "./scenario.ts";

export const before = async (page: Page) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto("https://flipgo.tv");
};

export const scenario: Scenario = (r) => {
    r.wait(2000);
    r.pointer.start(0.5, 0.5);
    r.pointer.goto('a[href="/about/"]');
    r.pointer.click();
    r.wait(2000);
};
