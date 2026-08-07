# Nemo UI Overhaul

Standalone SillyTavern UI package for connection/settings/extensions/lorebook overhauls, animated backgrounds, enhanced model selection, wide panels, mobile enhancements, quick lore access, and optional interface themes.

**Version:** 1.2.0

Install through Nemo Hub or SillyTavern's third-party extension installer with:

`https://github.com/NemoVonNirgend/NemoUIOverhaul`

The native Extensions settings drawer gates each feature group. Feature switches persist in `extension_settings.NemoUIOverhaul` and apply after reload; theme, wide-panel, and mobile options can update immediately. Existing compatible NemoPresetExt choices migrate on first launch.

## Ownership boundary

NemoUIOverhaul intentionally does **not** style or initialize prompt-workstation surfaces. NemoPresetExt 6.0 owns:

- Prompt manager rows and collapsible sections
- Prompt search, movement, archives, snapshots, and category trays
- Preset and character navigators
- Prompt directives and reasoning controls
- Classic 3.4, Modern, and Classic+ prompt interface modes

This separation ensures installing NemoUIOverhaul cannot override the prompt appearance selected in NemoPresetExt.

NemoUIOverhaul continues to own broader SillyTavern presentation:

- Connection and model-selection interfaces
- Settings, extensions, and advanced-formatting tabs
- Lorebook surfaces and quick access
- Background organization and animation
- Wide panels and mobile adaptations
- General interface and message themes

## Updating from 1.1

Version 1.2 removes historical prompt-manager and navigator selectors inherited from the old monolithic NemoPresetExt stylesheet. No user settings are deleted. Prompt-specific preferences and data remain with NemoPresetExt or the NemoPromptTools compatibility bridge during migration.
