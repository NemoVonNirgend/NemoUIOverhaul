import { detectOptionalUiCapabilities } from '../compat/optional-ui-compat.js';

const DRAWER_TARGETS = Object.freeze([
    { selector: '#max_context_block', title: 'Context Configuration', id: 'context_config' },
    { selector: '#instruct_mode_block', title: 'Instruct Mode Settings', id: 'instruct_mode' },
    { selector: '#response_configuration_block', title: 'AI Response Formatting', id: 'response_format' },
    { selector: '#model_specific_block', title: 'Model Specific Behavior', id: 'model_behavior' },
    { selector: '#openai_api-presets + #common-gen-settings-block', title: 'Common Generation Settings', id: 'common_gen_settings' },
    { selector: '#openai_settings', title: 'Chat Completion Settings', id: 'openai_chat_settings', chatCompletionOwned: true },
    { selector: '#range_block_openai', title: 'OpenAI Sampling', id: 'openai_sampling_specific', chatCompletionOwned: true },
    { selector: '#range_block_novel', title: 'NovelAI Sampling', id: 'novel_sampling_specific' },
    { root: '#textgenerationwebui_api-settings', candidate: '.flex-container', descendant: '#temp_textgenerationwebui', directChildren: true, title: 'Text Completion Sampling', id: 'textgen_sampling_specific' },
    { root: '#kobold_api-settings', candidate: '.flex-container', descendant: '#temp', directChildren: true, title: 'KoboldAI Sampling', id: 'kobold_sampling_specific' },
    { root: '#anthropic_api_settings_block', candidate: '.settings_group', descendant: '#anthropic_temp', title: 'Anthropic Sampling', id: 'anthropic_sampling_specific' },
]);

function resolveTarget(ui, config) {
    return config.descendant
        ? ui.findTargetWithDescendant(
            config.root,
            config.candidate,
            config.descendant,
            config.directChildren,
        )
        : document.querySelector(config.selector);
}

export function convertConfiguredTargets(ui) {
    const capabilities = detectOptionalUiCapabilities();

    for (const config of DRAWER_TARGETS) {
        if (config.chatCompletionOwned && capabilities.chatTabsOwnsLayout) {
            ui.releaseConvertedDrawer(config.id, config.selector);
            continue;
        }

        const element = resolveTarget(ui, config);
        if (element && !element.closest('.inline-drawer')) {
            ui.convertToInlineDrawer(element, config.title, false, config.id);
        }
    }

    const promptManager = document.querySelector('#completion_prompt_manager');
    const openaiDrawer = document.getElementById('nemo-drawer-openai_chat_settings');
    if (capabilities.chatTabsOwnsLayout) {
        ui.releaseStandalonePromptManager();
    } else if (promptManager && openaiDrawer && !promptManager.dataset.nemoStandalone) {
        ui._recordMove(promptManager);
        openaiDrawer.parentNode.insertBefore(promptManager, openaiDrawer.nextSibling);
        promptManager.dataset.nemoStandalone = 'true';
    }

    const extensionsContainer = document.querySelector('#extensions_settings');
    if (extensionsContainer && !extensionsContainer.dataset.nemoGrouped) {
        ui.groupNemoExtensions();
        extensionsContainer.dataset.nemoGrouped = 'true';
    }
}
