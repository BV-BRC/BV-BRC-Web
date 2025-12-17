/**
 * BV-BRC Client Library Bundle
 * Bundles the BV-BRC JavaScript client library
 */

// Import the pre-built BV-BRC client (UMD module)
import BVBRCClient from '../bvbrc_js_client/dist/bvbrc_client.js';

// Export to window for global access
window.BVBRCClient = BVBRCClient;

console.log('[BV-BRC Client Bundle] Loaded: BVBRCClient');

// Export as module
export default BVBRCClient;
