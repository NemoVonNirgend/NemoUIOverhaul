# Nemo UI Overhaul

Standalone SillyTavern UI package for connection, settings, extensions, lorebook overhauls, animated backgrounds, enhanced model selection, wide panels, mobile enhancements, quick lore access, and optional interface themes.

**Version:** 1.2.3

Install through Nemo Hub or SillyTavern's third-party extension installer with:

`https://github.com/NemoVonNirgend/NemoUIOverhaul`

The native Extensions settings drawer gates each feature group. Feature switches persist in `extension_settings.NemoUIOverhaul`. Most structural feature switches apply after reload; theme, wide-panel, mobile, and lorebook-preset visibility options update immediately. Existing compatible NemoPresetExt choices migrate on first launch.

## Optional UI compatibility

NemoUIOverhaul remains a complete standalone extension. Chat Completion Tabs, Moonlit Echoes, and AstraProjecta are not dependencies, and none of their modules are imported or called through private APIs.

At runtime, NemoUIOverhaul detects the interface capabilities that are actually present:

| Active extensions | Result |
| --- | --- |
| No Rivelle UI extension | Nemo owns its standalone Chat Completion drawers, model selector, settings tabs, lorebook workspace, extension browser, backgrounds, responsive layout, and optional theme. |
| Chat Completion Tabs | Rivelle owns the Parameters and Prompts tab layout. Nemo releases the affected native nodes and keeps its other UI enhancements active. |
| Moonlit Echoes | Nemo keeps its standalone layout and applies narrowly scoped height, wrapping, and overflow guards to prevent clipped preset text. |
| Chat Completion Tabs and Moonlit Echoes | Rivelle owns the tab structure, Moonlit owns the visual theme, and Nemo adds its independent controls without requiring either project. |
| AstraProjecta installed in desktop or inactive mode | Nemo remains fully active because Astra is not currently porting the native SillyTavern drawers. |
| AstraProjecta mobile mode | Astra owns the structural interface. Nemo temporarily suspends its connection, settings-tab, lorebook, extension-browser, background, model-selector, responsive, and theme layers while preserving every saved Nemo setting. |
| AstraProjecta releases mobile mode | Nemo restores its standalone structural UI automatically after Astra returns the native drawers. |

Chat Completion Tabs initializes after a short delay. Nemo detects the enabled extension before its tabs appear and temporarily yields those nodes, preventing both extensions from repeatedly moving the same controls.

AstraProjecta is a broader mobile shell rather than a single panel. It ports native drawers such as AI Response Configuration, Advanced Formatting, User Settings, Lorebooks, Backgrounds, and Extensions into its own hosts. Nemo therefore uses an explicit structural-owner handoff instead of allowing two observers to repeatedly reclaim the same elements. The settings drawer stays available inside Astra so users can review or change saved Nemo options, but structural changes are deferred until Nemo owns the interface again.

For diagnostics, open the browser console and run:

```js
window.NemoUIOverhaul?.getCompatibilityState?.()
```

The returned object reports Chat Completion Tabs and Moonlit state plus `astraPresent`, `astraActive`, `portedDrawerCount`, `structuralUiOwner`, and the current Nemo feature lifecycle state.

## Reasoning controls

SillyTavern exposes two different reasoning selectors:

- **Reasoning format template** controls the parsing and display format, including the reasoning prefix, suffix, and separator.
- **Model Reasoning Effort** controls how much reasoning the provider asks the model to perform.

They are intentionally independent and should not mirror one another. NemoUIOverhaul gives them explicit labels and, when a legacy or companion Nemo proxy is present, synchronizes each proxy only with its matching native control. Native SillyTavern values remain canonical, including after another extension replaces a selector node.

## Lorebook preset controls

The lorebook workspace includes an optional preset selector and preset-management buttons. Disable **Show lorebook preset controls** under the Nemo UI Overhaul settings drawer to hide that entire row.

This is display-only. Hiding the controls does not delete saved lorebook presets, change the active preset, or activate or deactivate any lorebook.

## Ownership boundary

NemoUIOverhaul intentionally does **not** style or initialize prompt-workstation surfaces. NemoPresetExt 6.0 owns:

- Prompt manager rows and collapsible sections
- Prompt search, movement, archives, snapshots, and category trays
- Preset and character navigators
- Prompt directives and prompt-side reasoning controls
- Classic 3.4, Modern, and Classic+ prompt interface modes

This separation ensures installing NemoUIOverhaul cannot override the prompt appearance selected in NemoPresetExt.

NemoUIOverhaul continues to own broader SillyTavern presentation whenever no external structural shell has claimed it:

- Connection and model-selection interfaces
- Settings, extensions, and advanced-formatting tabs
- Lorebook surfaces and quick access
- Background organization and animation
- Wide panels and mobile adaptations
- General interface and message themes

## Updating from 1.1

Version 1.2 removes historical prompt-manager and navigator selectors inherited from the old monolithic NemoPresetExt stylesheet. No user settings are deleted. Prompt-specific preferences and data remain with NemoPresetExt or the NemoPromptTools compatibility bridge during migration.
