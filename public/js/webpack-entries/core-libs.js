/**
 * Core Libraries Bundle
 * Consolidates: jquery + bvbrcClient + copilot libs (markdown-it, html2canvas)
 */

// External libraries
import $ from 'jquery';

// BV-BRC Client
import BVBRCClient from '../bvbrc_js_client/dist/bvbrc_client.js';

// Copilot libraries (from node_modules via webpack aliases)
import markdownit from 'markdown-it';
import html2canvas from 'html2canvas';

// Export to window for global access (needed by Dojo code)
window.$ = window.jQuery = $;
window.BVBRCClient = BVBRCClient;
window.markdownit = markdownit;
window.html2canvas = html2canvas;

console.log('[Core Bundle] Loaded: jquery, BVBRCClient, markdown-it, html2canvas');

// Export as module for potential future use
export { $, BVBRCClient, markdownit, html2canvas };
