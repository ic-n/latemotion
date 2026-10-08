<img src="logo.png" width="120" title="Late Motion logo featuring geometric abstraction of intersection of L & M letters, cool that you did read that haha">

<br/>

# LateMotion

Make your page to have motion design after it was already built

## Run the example

Requires Node.js 22.18 or newer and pnpm. Install dependencies with `pnpm install`, then run `task open` to log in to sites. Close that browser before running `task run` to reuse the login. Both commands use the persistent `.latemotion/profiles/main` browser profile, creating it automatically if needed. The profile is ignored by Git. The example scenario sets a 414×896 page viewport and opens [flipgo.tv](https://flipgo.tv). Complete any manual preparation, focus the browser, and press `p` to play the example scenario. The scenario clicks the About link.

Record the browser window with macOS screen recording tools when needed. Failures are written to `logs/trace.txt`. Run `task check` for a strict TypeScript check.

The example scenario is in `src/example.ts`. Its `before(page)` function sets the viewport and opens the initial URL before manual preparation. Scenario functions queue steps using `r.wait(milliseconds)`, `r.pointer.start(x, y)`, `r.pointer.move(x, y)`, `r.pointer.goto(selector)`, `r.pointer.click()`, and `r.scroll.intoView(selector, alignment)`. Pointer coordinates are normalized to the viewport. Pointer and scroll targets use the first visible DOM match for a selector. `move` animates the cursor to a viewport position; `goto` moves it to an element and focuses that element with a spotlight and lift; `click` plays a press animation and performs the Playwright click. Scroll alignment is `0` for the target start at the top, `0.5` for center, and `1` for the target end at the bottom. It defaults to `0.5` and scrolls nested containers as needed. The example clicks About, scrolls to the footer, then returns to the header.
