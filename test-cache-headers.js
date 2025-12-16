#!/usr/bin/env node

/**
 * Cache Headers Testing Script
 *
 * Tests that static assets have proper cache headers configured.
 *
 * Usage:
 *   node test-cache-headers.js
 *   TEST_URL=https://www.bv-brc.org node test-cache-headers.js
 *   VERSION=3.56.4 node test-cache-headers.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const VERSION = process.env.VERSION || '3.56.4';

const testCases = [
  {
    name: 'Versioned JS Asset',
    path: `/js/${VERSION}/bundle/bundle.js`,
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+.*immutable/i,
      'etag': /.+/,
      'expires': /.+/
    },
    required: true
  },
  {
    name: 'Versioned CSS Asset',
    path: `/js/${VERSION}/p3/resources/p3.css`,
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+.*immutable/i,
      'etag': /.+/,
      'expires': /.+/
    },
    required: true
  },
  {
    name: 'Image Asset',
    path: '/patric/images/bv-brc/bv-brc-header-logo.png',
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+.*immutable/i,
      'etag': /.+/,
      'expires': /.+/
    },
    required: true
  },
  {
    name: 'Public Asset',
    path: '/public/manifest.json',
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+/i,
      'etag': /.+/
    },
    required: true
  },
  {
    name: 'Unversioned JS Asset (Dev)',
    path: '/js/bundle/bundle.js',
    expectedHeaders: {
      'cache-control': /.+/  // Should have some cache control
    },
    required: false  // May not exist in production
  }
];

function testHeaders(url, testCase) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, (res) => {
      const results = {
        name: testCase.name,
        path: testCase.path,
        statusCode: res.statusCode,
        headers: res.headers,
        passed: true,
        failures: [],
        warnings: []
      };

      if (res.statusCode === 404) {
        if (testCase.required) {
          results.passed = false;
          results.failures.push(`Asset not found (404)`);
        } else {
          results.warnings.push(`Asset not found (404) - skipping`);
          results.passed = true; // Not a failure if not required
        }
        resolve(results);
        return;
      }

      // Check expected headers
      for (const [header, pattern] of Object.entries(testCase.expectedHeaders)) {
        const value = res.headers[header.toLowerCase()];
        if (!value) {
          if (testCase.required) {
            results.passed = false;
            results.failures.push(`Missing header: ${header}`);
          } else {
            results.warnings.push(`Missing header: ${header}`);
          }
        } else if (!pattern.test(value)) {
          if (testCase.required) {
            results.passed = false;
            results.failures.push(`Header ${header} value "${value}" doesn't match expected pattern`);
          } else {
            results.warnings.push(`Header ${header} value "${value}" doesn't match expected pattern`);
          }
        }
      }

      // Log cache-control details
      if (res.headers['cache-control']) {
        const cc = res.headers['cache-control'];
        results.cacheControl = cc;
        results.hasImmutable = /immutable/i.test(cc);
        results.maxAge = cc.match(/max-age=(\d+)/)?.[1];
        if (results.maxAge) {
          results.maxAgeDays = Math.round(results.maxAge / 86400);
        }
      }

      // Check for ETag
      if (res.headers['etag']) {
        results.hasETag = true;
        results.etag = res.headers['etag'];
      } else {
        results.warnings.push('Missing ETag header');
      }

      // Check for Expires
      if (res.headers['expires']) {
        results.hasExpires = true;
        results.expires = res.headers['expires'];
      }

      // Check for Last-Modified
      if (res.headers['last-modified']) {
        results.hasLastModified = true;
        results.lastModified = res.headers['last-modified'];
      }

      resolve(results);
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

function formatResults(results) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Cache Headers Test Results`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Version: ${VERSION}`);
  console.log(`${'='.repeat(70)}\n`);

  let allPassed = true;

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon}${reset} ${result.name}`);
    console.log(`   Path: ${result.path}`);
    console.log(`   Status: ${result.statusCode}`);

    if (result.statusCode === 404 && !result.required) {
      console.log(`   ⚠ Skipped (not found, not required)`);
      continue;
    }

    if (result.cacheControl) {
      console.log(`   Cache-Control: ${result.cacheControl}`);
      if (result.maxAge) {
        console.log(`   Max-Age: ${result.maxAge} seconds (${result.maxAgeDays} days)`);
      }
      console.log(`   Immutable: ${result.hasImmutable ? '✓ Yes' : '✗ No'}`);
    }

    if (result.hasETag) {
      console.log(`   ETag: ✓ Present`);
    } else {
      console.log(`   ETag: ✗ Missing`);
    }

    if (result.hasExpires) {
      console.log(`   Expires: ✓ Present (${result.expires})`);
    } else {
      console.log(`   Expires: ✗ Missing`);
    }

    if (result.hasLastModified) {
      console.log(`   Last-Modified: ✓ Present`);
    }

    if (result.failures.length > 0) {
      allPassed = false;
      console.log(`   ❌ Failures:`);
      result.failures.forEach(f => console.log(`      - ${f}`));
    }

    if (result.warnings.length > 0) {
      console.log(`   ⚠ Warnings:`);
      result.warnings.forEach(w => console.log(`      - ${w}`));
    }

    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const requiredPassed = results.filter(r => r.required && r.passed).length;
  const requiredTotal = results.filter(r => r.required).length;

  console.log(`${'='.repeat(70)}`);
  console.log(`Summary:`);
  console.log(`   Total Tests: ${total}`);
  console.log(`   Passed: ${passed}`);
  console.log(`   Required Tests Passed: ${requiredPassed}/${requiredTotal}`);

  if (allPassed && requiredPassed === requiredTotal) {
    console.log(`\n\x1b[32m✓ All tests passed!\x1b[0m\n`);
  } else {
    console.log(`\n\x1b[31m✗ Some tests failed. Please review the results above.\x1b[0m\n`);
  }

  return allPassed && requiredPassed === requiredTotal;
}

async function runTests() {
  const results = [];

  for (const testCase of testCases) {
    const url = `${BASE_URL}${testCase.path}`;
    try {
      const result = await testHeaders(url, testCase);
      results.push(result);
    } catch (error) {
      console.error(`✗ ${testCase.name}: ${error.message}`);
      results.push({
        name: testCase.name,
        path: testCase.path,
        passed: false,
        error: error.message,
        required: testCase.required
      });
    }
  }

  const success = formatResults(results);
  process.exit(success ? 0 : 1);
}

runTests().catch((error) => {
  console.error('Test execution failed:', error);
  process.exit(1);
});

