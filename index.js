import { initializeUiOverhaul, publishUiOverhaulApi } from './ui/overhaul-runtime.js';

publishUiOverhaulApi();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => void initializeUiOverhaul(), { once: true });
} else {
    void initializeUiOverhaul();
}
