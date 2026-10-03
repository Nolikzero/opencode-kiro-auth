export { KiroOAuthPlugin } from './plugin.js';
export default { id: 'kiro', server: (await import('./plugin.js')).KiroOAuthPlugin };
