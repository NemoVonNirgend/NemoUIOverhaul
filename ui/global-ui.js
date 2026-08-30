import { globalUiCore } from './global-ui-core.js';
import { globalUiGroups } from './global-ui-groups.js';
import { globalUiLayout } from './global-ui-layout.js';
import { globalUiLifecycle } from './global-ui-lifecycle.js';

export const NemoGlobalUI = {
    ...globalUiCore,
    ...globalUiGroups,
    ...globalUiLayout,
    ...globalUiLifecycle,
};
