# Sector chip theme design QA

- Source visual truth: `/var/folders/cd/2cs3zv7j0wdbxppl4q8bnrww0000gn/T/codex-clipboard-6e5d872d-fb71-451c-aad6-91da2dab7cea.png`
- Normalized source capture: `docs/design-qa/sector-chip-theme-2026-08-02/design-qa-source-dark.png`
- Light implementation capture: `docs/design-qa/sector-chip-theme-2026-08-02/design-qa-light-full.png`
- Dark implementation capture: `docs/design-qa/sector-chip-theme-2026-08-02/design-qa-dark.png`
- Viewport: 1132 x 846 CSS px
- Source pixels: 4064 x 2324; app viewport crop 2292 x 1712 normalized to 1132 x 846
- Implementation pixels: 1132 x 846 at device scale factor 1
- State: comparison screen, Rachmaninoff Piano Concerto No. 2, movements 1-3, first movement selected

## Full-view comparison evidence

`docs/design-qa/sector-chip-theme-2026-08-02/design-qa-comparison-dark.png` places the normalized marked source and the corrected dark implementation side by side. The source and implementation use different vertical scroll positions, so layout outside the movement-chip section was not judged as a fidelity difference.

`docs/design-qa/sector-chip-theme-2026-08-02/design-qa-comparison-modes.png` places the corrected light and dark implementations side by side at the same viewport and state.

## Focused region comparison evidence

`docs/design-qa/sector-chip-theme-2026-08-02/design-qa-focus-chips.png` compares the marked movement-chip region before and after the fix. The pre-fix dark state has white text on white unselected chips. The corrected state uses a white selected chip with dark text and dark secondary unselected chips with light text.

## Findings and fixes

- [P1, fixed] Dark-mode unselected movement chips had insufficient text contrast because the component hardcoded light backgrounds while the shared `Text` component applied dark foreground color.
  - Fix: replaced hardcoded `StyleSheet` colors with semantic `primary`, `secondary`, `foreground`, `border`, and muted theme tokens.
- [P2, fixed] Selected and unselected badges did not consistently inherit the active theme.
  - Fix: badge backgrounds and labels now use semantic foreground/background tokens for both modes.
- [P2, fixed] The optional add/edit controls hardcoded black or white icon colors.
  - Fix: controls now use `foreground` and `primary-foreground` tokens.

## Required fidelity surfaces

- Fonts and typography: unchanged from the existing component; size and weight match the source.
- Spacing and layout rhythm: chip padding, gap, radius, border width, and row wrapping are unchanged.
- Colors and visual tokens: passed in light and dark modes. Computed colors confirm light selected `rgb(23, 23, 23)` / light unselected `rgb(245, 245, 245)`, and dark selected `rgb(250, 250, 250)` / dark unselected `rgb(38, 38, 38)`.
- Image quality and asset fidelity: no image assets were changed; artist images and videos remain intact.
- Copy and content: movement labels and counts are unchanged.

## Interaction and runtime checks

- Composer search and Rachmaninoff selection passed.
- Theme toggle passed in both directions.
- Movement selection passed; selecting movement 2 correctly swapped selected/unselected colors.
- Browser console errors: 0.
- Production Expo web export and container deployment passed.

## Comparison history

1. Initial source: blocked by the P1 white-on-white dark-mode contrast defect marked in the user screenshot.
2. Post-fix implementation: semantic theme tokens applied, light/dark captures compared, movement selection retested, and no remaining P0/P1/P2 findings found.

final result: passed
