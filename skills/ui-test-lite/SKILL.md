# UI Test Lite — Token-Efficient UI/UX Testing

## Problem

Screenshots consume 50,000–200,000 tokens per image. A single UI verification cycle can burn through context rapidly.

## Solution: Accessibility Tree + Programmatic Measurement

Replace screenshots with text-based representations that cost 1/20 to 1/100 the tokens.

---

## Strategy Matrix

| What to verify | Method | Token cost |
|---|---|---|
| Element existence, text, structure | Accessibility tree (ariaSnapshot) | ~2KB |
| Position (x, y) and size (w, h) | `boundingBox()` | ~100B |
| Color, font, spacing, padding | `getComputedStyle()` | ~200B |
| Active/disabled/checked state | Accessibility tree | ~2KB |
| Overall layout "feel" | Screenshot (ONLY when needed) | ~100KB |

**Rule: Use screenshots only for "overall visual feel" checks. Everything else is text.**

---

## Setup: Playwright MCP (Recommended)

```bash
claude mcp add playwright npx '@playwright/mcp@latest' --scope project
```

For maximum token savings, use file output mode:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--output-mode", "file", "--output-dir", "/tmp/playwright-mcp-output"]
    }
  }
}
```

### Alternative: Claude --chrome (no setup)

```bash
claude --chrome
```

Built-in Chrome integration reads DOM/console as text. Use `--chrome` flag only when needed (always-on increases context from tool schemas).

---

## Techniques

### 1. Accessibility Tree Snapshot (Structure + Content)

Returns YAML text describing what a screen reader sees:

```yaml
- heading "Dashboard" [level=1]
- navigation:
  - link "Home"
  - link "Settings"
- button "Save" [disabled]
- table "User List":
  - row "Kim, 85, Room 101"
```

**Usage in Playwright MCP:** Ask to navigate and snapshot a specific region:

> "Open localhost:3001, navigate to /dashboard, and give me an aria snapshot of the main content area"

**Scoping tip:** Always scope to the relevant region, not the whole page:

```javascript
// BAD: whole page (~5KB)
await page.locator('body').ariaSnapshot();

// GOOD: specific section (~500B)
await page.locator('main').ariaSnapshot();
await page.locator('[data-testid="resident-table"]').ariaSnapshot();
```

### 2. boundingBox() (Position + Size)

Get exact pixel coordinates and dimensions as numbers:

```javascript
const box = await page.locator('button:has-text("Save")').boundingBox();
// → { x: 320, y: 580, width: 120, height: 40 }
```

**Batch measurement** for layout verification:

```javascript
const buttons = await page.locator('button').all();
for (const btn of buttons) {
  const box = await btn.boundingBox();
  const text = await btn.textContent();
  console.log(`${text}: ${JSON.stringify(box)}`);
}
```

**Common checks:**
- Button minimum touch target: `width >= 44 && height >= 44`
- Element alignment: compare `x` values across elements
- Spacing between elements: `nextBox.y - (prevBox.y + prevBox.height)`
- Element overlap: check if bounding boxes intersect

### 3. getComputedStyle() (Visual Properties)

Get any CSS property as text:

```javascript
const styles = await page.locator('.my-button').evaluate(el => {
  const s = getComputedStyle(el);
  return {
    color: s.color,
    backgroundColor: s.backgroundColor,
    fontSize: s.fontSize,
    padding: s.padding,
    margin: s.margin,
    borderRadius: s.borderRadius,
    boxShadow: s.boxShadow,
    fontFamily: s.fontFamily,
    fontWeight: s.fontWeight,
  };
});
```

**Bulk style audit** across components:

```javascript
const cards = await page.locator('.card').all();
for (const card of cards) {
  const styles = await card.evaluate(el => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, radius: s.borderRadius, shadow: s.boxShadow, padding: s.padding };
  });
  console.log(JSON.stringify(styles));
}
```

### 4. Incremental Verification

After a UI change, only check what changed:

```javascript
// Before change
const before = await page.locator('#target').ariaSnapshot();

// ... make changes ...

// After change - compare text diffs
const after = await page.locator('#target').ariaSnapshot();
```

---

## Workflow

### For Functional Testing (Does it work?)
1. Navigate to the page
2. Get aria snapshot of the relevant section
3. Verify elements exist, text is correct, states are right
4. Interact (click, type) and re-snapshot to verify changes

### For Layout Testing (Is it positioned correctly?)
1. Use `boundingBox()` on key elements
2. Check alignment, spacing, minimum sizes
3. Compare numbers — no screenshot needed

### For Style Testing (Does it look right?)
1. Use `getComputedStyle()` on components
2. Verify colors match design tokens
3. Check font sizes, padding, border radius

### For Visual Regression (Does the overall feel match?)
1. **Only now** take a screenshot
2. Scope to the smallest possible area
3. Ask a specific question ("Is the header blue?"), not "describe this page"

---

## Anti-Patterns

| Do NOT | Do Instead |
|---|---|
| Screenshot every page to "see" it | Aria snapshot + targeted measurements |
| "Describe this screenshot" (vague) | "Check if button width >= 44px" (specific) |
| Full-page screenshot for one button | `boundingBox()` on that button |
| Screenshot to check colors | `getComputedStyle().backgroundColor` |
| Keep screenshots in context | `/clear` after visual verification |
| Always-on `--chrome` | Use `--chrome` flag only when needed |

---

## Token Comparison

| Method | Per-page tokens | vs Screenshot |
|---|---|---|
| Screenshot (PNG) | 50,000–200,000 | 100% |
| Full page aria snapshot | 3,000–5,000 | 2–10% |
| Scoped aria snapshot (main only) | 500–2,000 | 1–4% |
| boundingBox() per element | 50–100 | 0.05% |
| getComputedStyle() per element | 100–200 | 0.1% |

**Bottom line: 10 scoped snapshots + 20 boundingBox checks = ~25KB. One screenshot = ~100KB+.**
