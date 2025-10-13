# Correspondence Games Shared Styles

This directory contains shared CSS styles and theming for all correspondence games in the framework.

## Files

- **`correspondence-games.css`** - Main stylesheet with variables, components, and dark mode support

## Usage

### Quick Start

Import the stylesheet in your game's CSS:

```css
/* In your App.css or main CSS file */
@import '@correspondence-games/core/src/styles/correspondence-games.css';

/* Your game-specific styles below */
```

This provides:
- CSS custom properties (variables) for colors, spacing, shadows
- Pre-styled button components
- Form elements with consistent styling
- Warning/share section styling
- Automatic dark mode support
- Utility classes

### Using Framework Classes

#### Buttons

```tsx
{/* Primary button (blue) */}
<button className="cg-button cg-button-primary">Click me</button>

{/* Success button (green) */}
<button className="cg-button cg-button-success">Start Game</button>

{/* Secondary button (gray) */}
<button className="cg-button cg-button-secondary">Cancel</button>

{/* With size modifiers */}
<button className="cg-button cg-button-primary cg-button-sm">Small</button>
<button className="cg-button cg-button-primary cg-button-lg">Large</button>
<button className="cg-button cg-button-primary cg-button-xl">Extra Large</button>
```

#### Forms

```tsx
<form className="cg-form" onSubmit={handleSubmit}>
  <label className="cg-form-label" htmlFor="name">
    Enter your name:
  </label>
  <input
    id="name"
    type="text"
    className="cg-form-input"
    required
  />
  <button type="submit" className="cg-button cg-button-primary">
    Continue
  </button>
</form>
```

#### Warning/Share Sections

```tsx
<div className="cg-warning-section">
  <h3>⚠️ Important Notice</h3>
  <p>Keep this browser tab open during the game.</p>
</div>
```

#### URL Display

```tsx
<div className="cg-url-display">
  {shareUrl}
</div>
```

#### Utility Classes

```tsx
<div className="cg-text-center cg-mb-lg">
  <h1 className="cg-heading">Game Title</h1>
  <p className="cg-text">Some description</p>
</div>
```

### Using CSS Variables

For custom styling, use the framework's CSS variables:

```css
.my-custom-element {
  /* Colors */
  background: var(--cg-color-bg-primary);
  color: var(--cg-color-text-primary);
  border: 1px solid var(--cg-color-border);

  /* Spacing */
  padding: var(--cg-spacing-md);
  margin-bottom: var(--cg-spacing-lg);

  /* Border Radius */
  border-radius: var(--cg-radius-md);

  /* Shadows */
  box-shadow: var(--cg-shadow-md);
}

/* Adjust for dark mode if needed */
@media (prefers-color-scheme: dark) {
  .my-custom-element {
    box-shadow: var(--cg-shadow-md-dark);
  }
}
```

### Available CSS Variables

#### Colors

**Text:**
- `--cg-color-text-primary` - Main text color
- `--cg-color-text-secondary` - Secondary text
- `--cg-color-text-tertiary` - Tertiary/muted text

**Backgrounds:**
- `--cg-color-bg-primary` - Main background
- `--cg-color-bg-secondary` - Secondary background
- `--cg-color-bg-tertiary` - Tertiary background
- `--cg-color-border` - Border color

**Brand Colors:**
- `--cg-color-primary` - Primary blue
- `--cg-color-primary-hover` - Primary blue hover
- `--cg-color-primary-dark` - Primary blue (dark mode)
- `--cg-color-primary-dark-hover` - Primary blue hover (dark mode)

- `--cg-color-success` - Success green
- `--cg-color-success-hover` - Success green hover
- `--cg-color-success-dark` - Success green (dark mode)
- `--cg-color-success-dark-hover` - Success green hover (dark mode)

- `--cg-color-warning` - Warning yellow
- `--cg-color-warning-bg` - Warning background
- `--cg-color-warning-border` - Warning border
- `--cg-color-warning-dark-bg` - Warning background (dark mode)
- `--cg-color-warning-dark-border` - Warning border (dark mode)

- `--cg-color-secondary` - Secondary gray
- `--cg-color-secondary-hover` - Secondary gray hover
- `--cg-color-secondary-dark-hover` - Secondary gray hover (dark mode)

**Game-Specific:**
- `--cg-color-board-bg` - Game board background
- `--cg-color-board-bg-dark` - Game board background (dark mode)
- `--cg-color-cell-bg` - Cell background
- `--cg-color-cell-bg-dark` - Cell background (dark mode)
- `--cg-color-cell-clickable` - Clickable cell
- `--cg-color-cell-clickable-dark` - Clickable cell (dark mode)
- `--cg-color-cell-hover` - Cell hover state
- `--cg-color-cell-hover-dark` - Cell hover state (dark mode)
- `--cg-color-winning` - Winning highlight color
- `--cg-color-winning-light` - Winning highlight (dark mode)

#### Shadows

- `--cg-shadow-sm` / `--cg-shadow-sm-dark` - Small shadow
- `--cg-shadow-md` / `--cg-shadow-md-dark` - Medium shadow
- `--cg-shadow-lg` / `--cg-shadow-lg-dark` - Large shadow

#### Spacing

- `--cg-spacing-xs` - 5px
- `--cg-spacing-sm` - 10px
- `--cg-spacing-md` - 20px
- `--cg-spacing-lg` - 30px
- `--cg-spacing-xl` - 40px

#### Border Radius

- `--cg-radius-sm` - 4px
- `--cg-radius-md` - 8px
- `--cg-radius-lg` - 12px

#### Typography

- `--cg-font-family` - System font stack
- `--cg-font-size-sm` - 12px
- `--cg-font-size-base` - 16px
- `--cg-font-size-lg` - 18px
- `--cg-font-size-xl` - 24px

## Dark Mode

The framework automatically supports dark mode via `prefers-color-scheme` media query.

**All CSS variables automatically adjust for dark mode.**

For custom elements, add dark mode overrides as needed:

```css
.my-element {
  background: var(--cg-color-bg-primary);
  /* Automatically light in light mode, dark in dark mode */
}

/* Only add custom overrides if framework variables aren't sufficient */
@media (prefers-color-scheme: dark) {
  .my-element {
    /* Custom dark mode styles */
  }
}
```

## Testing Dark Mode

### Browser DevTools

**Chrome/Edge:**
1. Open DevTools (F12)
2. Press Ctrl+Shift+P (Cmd+Shift+P on Mac)
3. Type "dark mode"
4. Select "Emulate CSS prefers-color-scheme: dark"

**Firefox:**
1. Open DevTools (F12)
2. Go to Inspector tab
3. Click the sun/moon icon

**Safari:**
1. Enable Develop menu
2. Develop > Experimental Features > Dark Mode CSS Support

### OS-Level

Change your system appearance settings to test:
- **macOS:** System Preferences > General > Appearance
- **Windows:** Settings > Personalization > Colors
- **Linux:** Varies by desktop environment

## Best Practices

1. **Always import the framework CSS first**
   ```css
   @import '@correspondence-games/core/src/styles/correspondence-games.css';
   /* Game-specific styles below */
   ```

2. **Use framework classes for common components**
   - Buttons: `.cg-button-*`
   - Forms: `.cg-form-*`
   - Layout: `.cg-container`

3. **Use CSS variables for custom styling**
   ```css
   color: var(--cg-color-text-primary);
   ```

4. **Add dark mode support for ALL custom elements**
   ```css
   @media (prefers-color-scheme: dark) {
     /* Dark mode overrides */
   }
   ```

5. **Test in both light and dark modes**
   - Verify sufficient contrast
   - Check all interactive elements
   - Test on multiple browsers

## Complete Documentation

For comprehensive guides:
- **Dark Mode:** See `/packages/core/DARK_MODE_GUIDE.md`
- **New Games:** See `/packages/core/NEW_GAME_GUIDE.md`
- **Name Collection Forms:** See `/packages/core/NAME_COLLECTION_PATTERN.md`

## Examples

Reference implementations:
- `games/tic-tac-toe/src/App.css` - Complete dark mode implementation
- `games/emoji-chain/src/App.css` - Alternative implementation

## Contributing

When adding new shared styles:

1. Add to `correspondence-games.css`
2. Use CSS variables for customization
3. Include dark mode support
4. Document in this README
5. Update `DARK_MODE_GUIDE.md`
6. Test in all existing games

## Version

**Current Version:** 1.0.0

**Last Updated:** October 2025
