<img src="logo.png" width="120" title="Late Motion logo featuring geometric abstraction of intersection of L & M letters, cool that you did read that haha">

<br/>

# LateMotion

Make your page to have motion design after it was already built

## Run the example

Requires Node.js 22.18 or newer and pnpm. Install dependencies with `pnpm install`, then run `task run`. The runner opens FlipGo in a visible Chromium browser. Complete any manual preparation, focus the browser, and press `p` to play the example scenario. The scenario clicks the About link.

Record the browser window with macOS screen recording tools when needed. Failures are written to `logs/trace.txt`. Run `task check` for a strict TypeScript check.

The example scenario is in `src/example.ts`. Scenario functions queue steps using `r.wait(milliseconds)`, `r.pointer.start(x, y)` with normalized viewport coordinates, `r.pointer.goto(selector)`, and `r.pointer.click()`. Pointer targets use the first DOM match for a selector. The runner opens the initial URL before calling the scenario.
