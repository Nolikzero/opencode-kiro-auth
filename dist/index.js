import { KiroV2Plugin } from './plugin-v2.js';
export { KiroV2Plugin } from './plugin-v2.js';
export { KiroOAuthPlugin } from './plugin.js';
// OpenCode 2 reads `id` and `setup`; OpenCode 1.18.29+ reads `server`. The two APIs
// are independent, so each runtime only uses its own half.
export default { ...KiroV2Plugin, server: (await import('./plugin.js')).KiroOAuthPlugin };
