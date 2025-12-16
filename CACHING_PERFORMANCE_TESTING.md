# Caching Performance Testing & Measurement Guide

## Pre-Implementation Baseline Measurements

### 1.1 Collect Baseline Metrics

**Before making any changes**, run these tests and record the results:

#### Browser DevTools Network Analysis
1. Open Chrome DevTools (F12) → Network tab
2. Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
3. Enable "Disable cache" checkbox
4. Reload page (Ctrl+R or Cmd+R)
5. Record the following metrics:

```
Metric                          | Baseline Value
--------------------------------|----------------
Total Requests                   | 347
Total Transfer Size             | 10.5 MB
Total Load Time                 | 5,610 ms (5.61 s)
DOMContentLoaded                | 967 ms
Load Event                      | 1,150 ms (1.15 s)
Static Asset Requests (JS/CSS)  | ~150-200 (estimated - count JS/CSS files)
Static Asset Size (JS/CSS)      | ~6-7 MB (estimated - subtract images/fonts)
Image Requests                  | ~20-30 (estimated - count image files)
Image Size                      | ~3-4 MB (estimated - workshop.jpg alone is 3.1 MB)
Font Requests                   | 1+ (KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMaxKUBHMdazTgWw.woff2 visible)
Font Size                       | <1 MB (estimated)
```

6. **Screenshot**: Take screenshot of Network tab waterfall
7. **Export HAR**: Right-click → "Save all as HAR with content"

#### Repeat Visit Test (No Cache Disabled)
1. **Disable** "Disable cache" checkbox
2. Reload page (Ctrl+R or Cmd+R)
3. Record metrics again:

```
Metric                          | Baseline (Repeat Visit)
--------------------------------|------------------------
Total Requests                   | 347
Total Transfer Size             | 10.5 MB
Requests from Cache             | 0 (no caching configured)
Requests from Network            | 347
```

#### Lighthouse Performance Audit
1. Open Chrome DevTools → Lighthouse tab
2. Select "Performance" category
3. Click "Generate report"
4. Record scores:

```
Metric                          | Baseline
--------------------------------|---------
Performance Score               | _____ / 100
First Contentful Paint (FCP)   | _____ s
Largest Contentful Paint (LCP) | _____ s
Total Blocking Time (TBT)       | _____ ms
Cumulative Layout Shift (CLS)  | _____
Speed Index                    | _____ s
```

5. **Export**: Click "Export" → Save JSON report

#### curl/HTTP Header Analysis
Run these commands and save output:

```bash
# Create baseline directory
mkdir -p performance-tests/baseline

# Test versioned JS assets
curl -I http://localhost:3000/js/3.56.4/bundle/bundle.js > performance-tests/baseline/versioned-js-headers.txt

# Test unversioned JS assets
curl -I http://localhost:3000/js/bundle/bundle.js > performance-tests/baseline/unversioned-js-headers.txt

# Test images
curl -I http://localhost:3000/patric/images/bv-brc/bv-brc-header-logo.png > performance-tests/baseline/image-headers.txt

# Test CSS
curl -I http://localhost:3000/js/3.56.4/p3/resources/p3.css > performance-tests/baseline/css-headers.txt

# Test public assets
curl -I http://localhost:3000/public/manifest.json > performance-tests/baseline/public-headers.txt
```

#### Server-Side Metrics
If you have access to server logs or monitoring:

```
Metric                          | Baseline
--------------------------------|---------
Requests per second             | _____
Bandwidth usage                 | _____ MB/s
Static asset requests           | _____ /s
404 errors (missing assets)     | _____ /s
```

---

## Testing Scripts

### 2.1 Automated Header Verification Script

Create `test-cache-headers.js`:

```javascript
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
    }
  },
  {
    name: 'Versioned CSS Asset',
    path: `/js/${VERSION}/p3/resources/p3.css`,
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+.*immutable/i,
      'etag': /.+/,
      'expires': /.+/
    }
  },
  {
    name: 'Image Asset',
    path: '/patric/images/bv-brc/bv-brc-header-logo.png',
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+.*immutable/i,
      'etag': /.+/,
      'expires': /.+/
    }
  },
  {
    name: 'Public Asset',
    path: '/public/manifest.json',
    expectedHeaders: {
      'cache-control': /public.*max-age=\d+/i,
      'etag': /.+/
    }
  }
];

function testHeaders(url, testCase) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client.get(url, (res) => {
      const results = {
        name: testCase.name,
        path: testCase.path,
        statusCode: res.statusCode,
        headers: res.headers,
        passed: true,
        failures: []
      };

      // Check expected headers
      for (const [header, pattern] of Object.entries(testCase.expectedHeaders)) {
        const value = res.headers[header.toLowerCase()];
        if (!value) {
          results.passed = false;
          results.failures.push(`Missing header: ${header}`);
        } else if (!pattern.test(value)) {
          results.passed = false;
          results.failures.push(`Header ${header} value "${value}" doesn't match pattern`);
        }
      }

      // Log cache-control details
      if (res.headers['cache-control']) {
        const cc = res.headers['cache-control'];
        results.cacheControl = cc;
        results.hasImmutable = /immutable/i.test(cc);
        results.maxAge = cc.match(/max-age=(\d+)/)?.[1];
      }

      resolve(results);
    }).on('error', reject);
  });
}

async function runTests() {
  console.log(`Testing cache headers for: ${BASE_URL}\n`);

  const results = [];
  for (const testCase of testCases) {
    const url = `${BASE_URL}${testCase.path}`;
    try {
      const result = await testHeaders(url, testCase);
      results.push(result);

      console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
      console.log(`  Path: ${result.path}`);
      console.log(`  Status: ${result.statusCode}`);
      if (result.cacheControl) {
        console.log(`  Cache-Control: ${result.cacheControl}`);
        console.log(`  Max-Age: ${result.maxAge} seconds (${Math.round(result.maxAge / 86400)} days)`);
        console.log(`  Immutable: ${result.hasImmutable ? 'Yes' : 'No'}`);
      }
      if (result.failures.length > 0) {
        result.failures.forEach(f => console.log(`  ❌ ${f}`));
      }
      console.log('');
    } catch (error) {
      console.error(`✗ ${testCase.name}: ${error.message}\n`);
      results.push({
        name: testCase.name,
        path: testCase.path,
        passed: false,
        error: error.message
      });
    }
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  console.log(`\nSummary: ${passed}/${total} tests passed`);

  return results;
}

runTests().catch(console.error);
```

**Usage:**
```bash
# Test local development
node test-cache-headers.js

# Test production
TEST_URL=https://www.bv-brc.org node test-cache-headers.js

# Test with specific version
VERSION=3.56.4 TEST_URL=http://localhost:3000 node test-cache-headers.js
```

### 2.2 Performance Comparison Script

Create `compare-performance.js`:

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const ITERATIONS = 5;

function measureLoadTime(url) {
  const start = Date.now();
  try {
    execSync(`curl -s -o /dev/null -w "%{time_total}" "${url}"`, { encoding: 'utf8' });
  } catch (e) {
    return null;
  }
  return Date.now() - start;
}

function getAssetSize(url) {
  try {
    const size = execSync(`curl -s -o /dev/null -w "%{size_download}" "${url}"`, { encoding: 'utf8' });
    return parseInt(size);
  } catch (e) {
    return null;
  }
}

function getHeaders(url) {
  try {
    const headers = execSync(`curl -sI "${url}"`, { encoding: 'utf8' });
    return headers;
  } catch (e) {
    return null;
  }
}

const assets = [
  '/js/3.56.4/bundle/bundle.js',
  '/js/3.56.4/p3/resources/p3.css',
  '/patric/images/bv-brc/bv-brc-header-logo.png',
  '/public/manifest.json'
];

async function testAsset(url) {
  const fullUrl = `${BASE_URL}${url}`;
  const times = [];
  const sizes = [];

  console.log(`Testing: ${url}`);

  // First request (cold)
  const coldTime = measureLoadTime(fullUrl);
  const coldSize = getAssetSize(fullUrl);
  times.push(coldTime);
  sizes.push(coldSize);

  // Subsequent requests (should be cached)
  for (let i = 0; i < ITERATIONS; i++) {
    const time = measureLoadTime(fullUrl);
    times.push(time);
  }

  const headers = getHeaders(fullUrl);
  const cacheControl = headers?.match(/cache-control:\s*(.+)/i)?.[1];
  const etag = headers?.match(/etag:\s*(.+)/i)?.[1];

  return {
    url,
    coldTime,
    coldSize,
    avgWarmTime: times.slice(1).reduce((a, b) => a + b, 0) / (times.length - 1),
    minWarmTime: Math.min(...times.slice(1)),
    maxWarmTime: Math.max(...times.slice(1)),
    cacheControl,
    etag,
    headers
  };
}

async function runComparison() {
  console.log(`Performance Comparison Test\nBase URL: ${BASE_URL}\n`);

  const results = [];
  for (const asset of assets) {
    const result = await testAsset(asset);
    results.push(result);

    console.log(`\n${asset}:`);
    console.log(`  Cold load: ${result.coldTime}ms, ${(result.coldSize / 1024).toFixed(2)}KB`);
    console.log(`  Warm avg: ${result.avgWarmTime.toFixed(2)}ms`);
    console.log(`  Warm min: ${result.minWarmTime}ms`);
    console.log(`  Cache-Control: ${result.cacheControl || 'NOT SET'}`);
    console.log(`  ETag: ${result.etag ? 'Present' : 'Missing'}`);
  }

  // Save results
  fs.writeFileSync(
    'performance-tests/comparison-results.json',
    JSON.stringify(results, null, 2)
  );

  console.log('\nResults saved to performance-tests/comparison-results.json');
}

runComparison().catch(console.error);
```

---

## Manual Testing Procedures

### 3.1 Browser Cache Verification

#### Test 1: First Load (Cold Cache)
1. Open Chrome DevTools → Network tab
2. **Enable** "Disable cache" checkbox
3. Clear browser cache (Ctrl+Shift+Delete)
4. Navigate to homepage
5. **Record**:
   - Total requests: _____
   - Total size: _____ MB
   - Load time: _____ ms
   - All assets should show status 200

#### Test 2: Second Load (Warm Cache)
1. **Disable** "Disable cache" checkbox
2. Reload page (Ctrl+R)
3. **Record**:
   - Total requests: _____
   - Total size: _____ MB (should be much smaller)
   - Load time: _____ ms (should be faster)
   - Most assets should show "(from disk cache)" or "(from memory cache)"
   - **Expected**: Zero network requests for static assets

#### Test 3: Hard Reload
1. Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
2. **Verify**: Still uses cache (should see 304 Not Modified or from cache)
3. **Note**: Hard reload should still respect cache headers for versioned assets

#### Test 4: ETag Validation
1. Open DevTools → Network tab
2. Load page
3. Note ETag value for an asset (e.g., `bundle.js`)
4. Reload page
5. **Verify**: Request shows `If-None-Match: <etag>` header
6. **Verify**: Response is 304 Not Modified (not 200)

### 3.2 Network Tab Analysis

For each static asset, verify:

```
Asset                    | Status | Size | Time | Cache Status
-------------------------|--------|------|------|----------------
bundle.js                |  200   |  X MB|  X ms| (from disk cache)
p3.css                   |  200   |  X KB|  X ms| (from disk cache)
logo.png                 |  200   |  X KB|  X ms| (from disk cache)
manifest.json            |  200   |  X KB|  X ms| (from disk cache)
```

**Expected Results After Fix:**
- First load: All 200, full size downloaded
- Second load: All "(from disk cache)" or "(from memory cache)", 0 bytes transferred
- Network requests: 0 for static assets on repeat visits

### 3.3 Response Headers Verification

In Network tab, click on each asset → Headers tab → Response Headers:

**Check for:**
- ✅ `Cache-Control: public, max-age=30758400, immutable` (for versioned assets)
- ✅ `Cache-Control: public, max-age=31536000, immutable` (for images)
- ✅ `ETag: "..."` (present)
- ✅ `Expires: ...` (future date)
- ✅ `Last-Modified: ...` (present)

---

## Performance Metrics to Track

### 4.1 Key Performance Indicators (KPIs)

#### Before Implementation
```
Metric                          | Value
--------------------------------|--------
Page Load Time (First Visit)    | _____ ms
Page Load Time (Repeat Visit)   | _____ ms
Static Asset Transfer (First)    | _____ MB
Static Asset Transfer (Repeat)   | _____ MB
Network Requests (First)         | _____
Network Requests (Repeat)        | _____
Time to Interactive (TTI)        | _____ ms
```

#### After Implementation (Target Improvements)
```
Metric                          | Target Improvement
--------------------------------|-------------------
Page Load Time (Repeat Visit)   | 50-80% reduction
Static Asset Transfer (Repeat)  | 90-100% reduction
Network Requests (Repeat)       | 70-90% reduction
Time to Interactive (TTI)       | 30-50% reduction
```

### 4.2 Lighthouse Metrics

Run Lighthouse before and after:

```
Metric                          | Before | After | Improvement
--------------------------------|--------|-------|------------
Performance Score               |   __   |  __   |   +__ pts
First Contentful Paint (FCP)   |  __ s  | __ s  |   __% faster
Largest Contentful Paint (LCP) |  __ s  | __ s  |   __% faster
Total Blocking Time (TBT)       | __ ms  | __ ms |   __% faster
Speed Index                    |  __ s  | __ s  |   __% faster
```

**How to Run:**
1. Chrome DevTools → Lighthouse
2. Select "Performance"
3. Click "Generate report"
4. Compare scores

### 4.3 WebPageTest Analysis

Use [WebPageTest.org](https://www.webpagetest.org/) for detailed analysis:

1. Go to https://www.webpagetest.org/
2. Enter your URL
3. Select test location
4. Run test
5. **Compare metrics**:
   - First Byte Time
   - Start Render
   - Speed Index
   - Total Load Time
   - Requests
   - Bytes In

**Key Metrics to Compare:**
- **Repeat View**: Should show dramatic improvement (cached assets)
- **Waterfall View**: Should show most assets loading from cache (green bars)

---

## Automated Testing with Playwright/Puppeteer

### 5.1 Create Performance Test

Create `test-performance.js`:

```javascript
const { chromium } = require('playwright');

async function measurePerformance(url) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // First load (cold cache)
  await page.goto(url, { waitUntil: 'networkidle' });
  const firstLoadMetrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      loadComplete: perf.loadEventEnd - perf.loadEventStart,
      totalTime: perf.loadEventEnd - perf.fetchStart
    };
  });

  const firstLoadNetwork = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(r => ({
      name: r.name,
      duration: r.duration,
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize
    }));
  });

  // Second load (warm cache)
  await page.reload({ waitUntil: 'networkidle' });
  const secondLoadMetrics = await page.evaluate(() => {
    const perf = performance.getEntriesByType('navigation')[0];
    return {
      domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
      loadComplete: perf.loadEventEnd - perf.loadEventStart,
      totalTime: perf.loadEventEnd - perf.fetchStart
    };
  });

  const secondLoadNetwork = await page.evaluate(() => {
    return performance.getEntriesByType('resource').map(r => ({
      name: r.name,
      duration: r.duration,
      transferSize: r.transferSize,
      encodedBodySize: r.encodedBodySize
    }));
  });

  await browser.close();

  // Calculate improvements
  const staticAssetsFirst = firstLoadNetwork.filter(r =>
    r.name.includes('.js') || r.name.includes('.css') || r.name.includes('.png') || r.name.includes('.jpg')
  );
  const staticAssetsSecond = secondLoadNetwork.filter(r =>
    r.name.includes('.js') || r.name.includes('.css') || r.name.includes('.png') || r.name.includes('.jpg')
  );

  const firstTotalSize = staticAssetsFirst.reduce((sum, r) => sum + r.transferSize, 0);
  const secondTotalSize = staticAssetsSecond.reduce((sum, r) => sum + r.transferSize, 0);

  return {
    firstLoad: {
      metrics: firstLoadMetrics,
      staticAssetCount: staticAssetsFirst.length,
      staticAssetSize: firstTotalSize,
      totalRequests: firstLoadNetwork.length
    },
    secondLoad: {
      metrics: secondLoadMetrics,
      staticAssetCount: staticAssetsSecond.length,
      staticAssetSize: secondTotalSize,
      totalRequests: secondLoadNetwork.length
    },
    improvement: {
      loadTimeReduction: ((firstLoadMetrics.totalTime - secondLoadMetrics.totalTime) / firstLoadMetrics.totalTime * 100).toFixed(1),
      sizeReduction: ((firstTotalSize - secondTotalSize) / firstTotalSize * 100).toFixed(1),
      requestReduction: ((firstLoadNetwork.length - secondLoadNetwork.length) / firstLoadNetwork.length * 100).toFixed(1)
    }
  };
}

async function runTest() {
  const url = process.env.TEST_URL || 'http://localhost:3000';
  console.log(`Testing: ${url}\n`);

  const results = await measurePerformance(url);

  console.log('First Load:');
  console.log(`  Total Time: ${results.firstLoad.metrics.totalTime.toFixed(0)}ms`);
  console.log(`  Static Assets: ${results.firstLoad.staticAssetCount} requests, ${(results.firstLoad.staticAssetSize / 1024).toFixed(2)}KB`);
  console.log(`  Total Requests: ${results.firstLoad.totalRequests}`);

  console.log('\nSecond Load (Cached):');
  console.log(`  Total Time: ${results.secondLoad.metrics.totalTime.toFixed(0)}ms`);
  console.log(`  Static Assets: ${results.secondLoad.staticAssetCount} requests, ${(results.secondLoad.staticAssetSize / 1024).toFixed(2)}KB`);
  console.log(`  Total Requests: ${results.secondLoad.totalRequests}`);

  console.log('\nImprovements:');
  console.log(`  Load Time: ${results.improvement.loadTimeReduction}% faster`);
  console.log(`  Size: ${results.improvement.sizeReduction}% reduction`);
  console.log(`  Requests: ${results.improvement.requestReduction}% reduction`);

  return results;
}

runTest().catch(console.error);
```

**Usage:**
```bash
npm install playwright
npx playwright install chromium
TEST_URL=http://localhost:3000 node test-performance.js
```

---

## Monitoring in Production

### 6.1 Server Logs Analysis

Monitor these metrics:

```bash
# Count cache hits vs misses (if using reverse proxy)
grep "304\|200" /var/log/nginx/access.log | awk '{print $9}' | sort | uniq -c

# Bandwidth usage for static assets
grep "GET.*\.\(js\|css\|png\|jpg\|svg\)" /var/log/nginx/access.log | awk '{sum+=$10} END {print sum/1024/1024 " MB"}'

# Response times for static assets
grep "GET.*\.\(js\|css\)" /var/log/nginx/access.log | awk '{print $10, $NF}' | sort -n
```

### 6.2 Real User Monitoring (RUM)

If you have RUM tools (e.g., Google Analytics, New Relic):

**Track:**
- Page load time
- Time to Interactive
- First Contentful Paint
- Network requests
- Cache hit rate

**Compare:**
- Before vs After deployment
- Week-over-week trends
- Percentile improvements (P50, P75, P95)

### 6.3 CDN Analytics (if using CDN)

Monitor:
- Cache hit ratio (should be >90% for static assets)
- Origin requests (should decrease)
- Bandwidth savings
- Response times

---

## Success Criteria

### ✅ Caching is Working If:

1. **Repeat visits show zero static asset downloads**
   - Network tab shows "(from disk cache)" or "(from memory cache)"
   - Transfer size is near zero for static assets

2. **Headers are correct**
   - Versioned assets have `immutable` directive
   - All static assets have `Cache-Control` with long max-age
   - ETag headers are present

3. **Performance improvements**
   - Repeat visit load time: **50-80% faster**
   - Static asset transfer: **90-100% reduction**
   - Network requests: **70-90% reduction**

4. **304 Not Modified responses**
   - Conditional requests return 304 (not 200)
   - ETag validation works correctly

### ❌ Issues to Watch For:

- Assets still downloading on every request
- Missing cache headers
- 200 responses instead of 304 for cached assets
- Performance not improving
- Cache headers being stripped by proxy/CDN

---

## Testing Checklist

Use this checklist when testing:

- [ ] Baseline metrics collected
- [ ] Headers verified (Cache-Control, ETag, Expires)
- [ ] First load tested (cold cache)
- [ ] Second load tested (warm cache)
- [ ] ETag validation tested (304 responses)
- [ ] Performance improvements measured
- [ ] Lighthouse scores compared
- [ ] Multiple browsers tested (Chrome, Firefox, Safari)
- [ ] Mobile devices tested
- [ ] Production environment tested
- [ ] CDN/proxy caching verified
- [ ] Server logs analyzed
- [ ] No regressions found

---

## Quick Test Commands

```bash
# Test cache headers
curl -I http://localhost:3000/js/3.56.4/bundle/bundle.js | grep -i cache

# Test ETag
ETAG=$(curl -sI http://localhost:3000/js/3.56.4/bundle/bundle.js | grep -i etag | cut -d' ' -f2 | tr -d '\r')
curl -I -H "If-None-Match: $ETAG" http://localhost:3000/js/3.56.4/bundle/bundle.js

# Measure load time
time curl -s http://localhost:3000/js/3.56.4/bundle/bundle.js > /dev/null

# Check all static asset headers
for asset in bundle.js p3.css logo.png manifest.json; do
  echo "Testing $asset..."
  curl -I http://localhost:3000/js/3.56.4/$asset 2>/dev/null | grep -i "cache-control\|etag\|expires"
done
```

---

## Reporting Template

After implementation, create a report:

```markdown
# Caching Implementation Results

## Date: [DATE]
## Environment: [PRODUCTION/STAGING]

### Performance Improvements
- Page Load Time: [BEFORE]ms → [AFTER]ms ([X]% improvement)
- Static Asset Transfer: [BEFORE]MB → [AFTER]MB ([X]% reduction)
- Network Requests: [BEFORE] → [AFTER] ([X]% reduction)

### Header Verification
- ✅ Versioned assets have `immutable` directive
- ✅ All static assets have Cache-Control headers
- ✅ ETag headers present
- ✅ Expires headers set correctly

### Browser Testing
- ✅ Chrome: Pass
- ✅ Firefox: Pass
- ✅ Safari: Pass

### Issues Found
- [List any issues]

### Next Steps
- [List follow-up items]
```

