/**
 * Copilot Libraries Bundle
 * Fixes missing dependencies: markdown-it, html2canvas
 * Using optimized versions from node_modules
 */

// Import markdown-it for markdown rendering (from node_modules via webpack alias)
import markdownit from 'markdown-it';

// Import html2canvas for screenshot functionality (from node_modules via webpack alias)
import html2canvas from 'html2canvas';

// Export to window for Dojo AMD modules
window.markdownit = markdownit;
window.html2canvas = html2canvas;

console.log('[Copilot Bundle] Loaded: markdown-it, html2canvas from node_modules');

// Export as module
export { markdownit, html2canvas };
