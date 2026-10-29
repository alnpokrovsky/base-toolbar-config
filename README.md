# Base Toolbar Config

**English** | [Русский](README.ru.md)

Configure which toolbar buttons are visible in Obsidian [Bases](https://help.obsidian.md/bases) — both in standalone `.base` files and in embedded bases inside notes. Add custom view-switcher buttons, hide what you don't use, and keep the UI clean.

## Features

- **Per-file toolbar configuration** — decide which buttons each `.base` file shows, from the plugin settings or directly from the file's YAML.
- **Embed support** — the same rules apply to `![[file.base]]` embeds inside Markdown notes.
- **Custom view-switcher buttons** — pin views you switch between often as toolbar buttons with icons or labels.
- **Default button** — set a single "home" button that jumps to a specific view.
- **Drag-and-drop reorder** of custom buttons.
- **Multilingual UI** — English, Russian, Chinese (follows Obsidian's language).

## Installation

### From the community plugins list

> Not yet published. This section will be updated once the plugin is accepted into the Obsidian community catalogue.

### Manual installation

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](../../releases).
2. Create the folder `<your-vault>/.obsidian/plugins/base-toolbar-config/`.
3. Copy the three files into that folder.
4. Restart Obsidian and enable the plugin in **Settings → Community plugins**.

## Usage

### Hiding toolbar buttons via settings

1. Open **Settings → Base Toolbar Config**.
2. Click **+ Add Base** and pick a `.base` file.
3. Use the toggles under **Interface** to hide individual buttons for this file:
   - Result counter (`X results`)
   - Search
   - Properties
   - Filter
   - Sort
   - Group
   - Views

### Hiding toolbar buttons via `.base` YAML

The plugin also reads a `toolbar.hide` block from the `.base` file itself. This is useful when you want the configuration to travel with the file (for example, when sharing it with others).

```yaml
toolbar:
  hide:
    - search
    - filter
    - sort

views:
  - type: table
    name: "Main"
```

Both mechanisms work as a **union**: a button is hidden if it's listed in `toolbar.hide` **or** its toggle is enabled in the plugin settings. Unknown tokens are silently ignored.

#### Supported tokens

| Token          | Hides                      |
| -------------- | -------------------------- |
| `result-count` | The "X results" counter    |
| `search`       | The search button          |
| `properties`   | The properties menu        |
| `filter`       | The filter menu            |
| `sort`         | The sort menu              |
| `group`        | The group menu             |
| `views`        | The view switcher menu     |

### Embeds

The same `toolbar.hide` rules apply to bases embedded inside notes:

```markdown
![[projects.base]]
```

The plugin resolves the embed's `src` attribute to an actual `.base` file (including `folder/file.base` paths, `#anchor` suffixes and `|alias` forms) and applies the file's configuration to the embed.

> **Note:** Bases created as inline ```` ```base ```` code blocks are **not** affected — they aren't tied to a specific `.base` file, so there is no configuration to read.

### Custom view-switcher buttons

You can pin any view from a `.base` file as a toolbar button:

1. In **Settings → Base Toolbar Config**, pick a `.base` file.
2. Under **Custom Buttons**, click **+ Add**.
3. Choose an icon, bind a view and pick the display mode:
   - **Icon view** — compact, shows only the icon.
   - **Text view** — icon + view name, useful in wide panels.
4. Drag rows to change the button order.

A **Default Button** can also be enabled, which jumps to a chosen view in one click.

### Custom view style

Enable **Custom view menu style** under **Interface** to make the toolbar wrap gracefully when the panel is narrow. This is useful for embeds with very limited width.

## Styling in themes

All UI elements use standard Obsidian CSS variables (`--background-modifier-hover`, `--interactive-accent`, `--text-normal`, etc.), so they adapt to light/dark themes and community themes automatically.

If you want to override the plugin's own styles, use the following classes:

- `.my-base-btns-container` — wrapper for injected buttons
- `.my-base-btn` — a single custom button
- `.bvs-text-mode` — applied when the button shows text
- `.bth-hide-<token>` — applied to the container when a button should be hidden (`search`, `filter`, `sort`, `properties`, `result-count`, `group`, `views`)
- `.bvs-hide-<token>` — legacy aliases kept for backwards compatibility

## Requirements

- Obsidian **1.13.0** or newer (the plugin relies on `getSettingDefinitions()` and `setDestructive()`, both introduced in 1.13).

## Development

```bash
# Install dependencies
npm install

# Watch mode (rebuilds main.js on save)
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

The built `main.js` must be copied into `<your-vault>/.obsidian/plugins/base-toolbar-config/` along with `manifest.json` and `styles.css`.

### Project structure

```
src/
├── main.ts                 # Plugin entry: settings UI, toolbar logic, i18n wiring
└── i18n/
    ├── keys.ts             # All translatable keys + module augmentation
    ├── index.ts            # I18N service init + t() helper
    └── locales/
        ├── en.ts
        ├── ru.ts
        └── zh.ts
styles.css                  # Toolbar hiding + custom UI styles
manifest.json
```

### Adding a new toolbar button to hide

1. Add the token in `HIDE_TOKEN_TO_CLASS` and `ALL_HIDE_CLASSES` in `src/main.ts`.
2. Add `hideXxx` to `FileConfig`, `DEFAULT_FILE_CONFIG` and `applyConfigHideClasses`.
3. Add a toggle in `getSettingDefinitions()`.
4. Add the key to `src/i18n/keys.ts` and all locale files.
5. Add a CSS rule using the exact class from Obsidian (inspect the button in DevTools to confirm).

## License

MIT