# Static Asset Caching Fix Checklist

## Phase 1: Critical Fixes - Add Caching Headers to All Static Routes

### 1.1 Fix Unversioned `/js/` Route
- [ ] **File**: `app.js` line 139
- [ ] Add caching configuration to `/js/` route
- [ ] **Decision needed**:
  - Option A: Short TTL (1 hour) for dev assets
  - Option B: Same long TTL as versioned, but without `immutable`
  - Option C: Conditional based on `req.production` flag
- [ ] **Recommended**: Option C - Short TTL in dev, long TTL in production
- [ ] Test: Verify `/js/bundle/bundle.js` returns cache headers

### 1.2 Fix `/patric/` Route (Non-Images)
- [ ] **File**: `app.js` line 153
- [ ] Add caching configuration to `/patric/` route
- [ ] **Note**: `/patric/images` already has caching (line 140), but other `/patric/` paths don't
- [ ] Set `maxage: '365d'` with `Expires` header
- [ ] Test: Verify `/patric/favicon.ico` and other `/patric/` assets return cache headers

### 1.3 Fix `/public/` Route
- [ ] **File**: `app.js` line 154
- [ ] Add caching configuration to `/public/` route
- [ ] Set `maxage: '365d'` with `Expires` header
- [ ] Test: Verify `/public/manifest.json` returns cache headers

### 1.4 Fix Favicon Route
- [ ] **File**: `app.js` line 35
- [ ] Check if `serve-favicon` middleware has caching options
- [ ] Add explicit caching if needed
- [ ] Test: Verify `/favicon.ico` returns cache headers

---

## Phase 2: Add `immutable` Directive to Versioned Assets

### 2.1 Update `staticHeaders` Object
- [ ] **File**: `app.js` lines 125-132
- [ ] Modify `setHeaders` function to include `Cache-Control` with `immutable`
- [ ] **Format**: `Cache-Control: public, max-age=30758400, immutable` (30758400 seconds = 356 days)
- [ ] Keep existing `Expires` header for compatibility
- [ ] Test: Verify `/js/3.56.4/...` assets return `immutable` directive

### 2.2 Update `/patric/images` Route
- [ ] **File**: `app.js` lines 140-147
- [ ] Add `immutable` directive to `Cache-Control` header
- [ ] **Format**: `Cache-Control: public, max-age=31536000, immutable` (31536000 seconds = 365 days)
- [ ] Test: Verify `/patric/images/...` assets return `immutable` directive

---

## Phase 3: Ensure ETag and Last-Modified Headers

### 3.1 Verify Express Static Middleware Behavior
- [ ] Check if Express `express.static` automatically generates ETag headers
- [ ] **Note**: Express should generate ETag by default, but verify
- [ ] Test: Check response headers for `ETag` and `Last-Modified` on static assets
- [ ] If missing, add explicit ETag generation in `setHeaders` function

### 3.2 Add Explicit ETag Generation (if needed)
- [ ] **File**: `app.js` - Update `staticHeaders.setHeaders`
- [ ] Use `crypto` module to generate ETag from file stats
- [ ] **Format**: `ETag: "W/"<hash>"` (weak ETag) or `"<hash>"` (strong ETag)
- [ ] Test: Verify ETag headers are present and change when files change

---

## Phase 4: Environment-Specific Caching Strategy

### 4.1 Create Environment-Aware Caching Config
- [ ] **File**: `app.js`
- [ ] Create separate caching configs for production vs development
- [ ] **Production**: Long TTL (365d) with `immutable` for versioned assets
- [ ] **Development**: Short TTL (1h) or `no-cache` for unversioned assets
- [ ] Use `req.production` or `config.get('production')` to determine environment

### 4.2 Update Unversioned Routes for Environment
- [ ] **File**: `app.js` line 139 (`/js/` route)
- [ ] Apply conditional caching based on environment
- [ ] **Production**: Long TTL (same as versioned)
- [ ] **Development**: Short TTL or `Cache-Control: no-cache`
- [ ] Test: Verify different behavior in dev vs production

---

## Phase 5: Content Hashing Implementation (Future Enhancement)

### 5.1 Research Build Process
- [ ] Review `buildClient.sh` and build scripts
- [ ] Identify where to inject content hashing
- [ ] **Files to check**:
  - `buildClient.sh`
  - `public/js/release.profile.js`
  - `public/js/bundle/make_bundle.sh`
  - `public/js/bundle/make_bundle2.sh`

### 5.2 Implement Content Hashing
- [ ] Add hash to filenames during build (e.g., `bundle.a1b2c3.js`)
- [ ] Update build scripts to generate manifest file with hashed filenames
- [ ] Modify templates to read from manifest and inject hashed filenames
- [ ] **Files to modify**:
  - Build scripts
  - `views/javascript.ejs`
  - `views/header.ejs`

### 5.3 Update Asset References
- [ ] Update all hardcoded asset references to use hashed versions
- [ ] Ensure versioned paths still work as fallback
- [ ] Test: Verify hashed assets load correctly

---

## Phase 6: Testing and Verification

### 6.1 Manual Testing Checklist
- [ ] **Versioned JS assets**: `/js/3.56.4/bundle/bundle.js`
  - [ ] Returns `Cache-Control: public, max-age=30758400, immutable`
  - [ ] Returns `ETag` header
  - [ ] Returns `Expires` header
  - [ ] Returns `Last-Modified` header

- [ ] **Unversioned JS assets**: `/js/bundle/bundle.js`
  - [ ] Returns appropriate cache headers (based on environment)
  - [ ] Production: Long TTL
  - [ ] Development: Short TTL or no-cache

- [ ] **CSS assets**: `/js/3.56.4/p3/resources/p3.css`
  - [ ] Returns `immutable` directive
  - [ ] Returns all cache headers

- [ ] **Images**: `/patric/images/bv-brc/bv-brc-header-logo.png`
  - [ ] Returns `Cache-Control: public, max-age=31536000, immutable`
  - [ ] Returns `ETag` header

- [ ] **Other static assets**: `/public/manifest.json`, `/patric/favicon.ico`
  - [ ] Returns appropriate cache headers

### 6.2 Browser DevTools Verification
- [ ] Open Chrome DevTools → Network tab
- [ ] Load homepage and check static assets
- [ ] Verify cache status shows "from disk cache" or "from memory cache" on reload
- [ ] Check Response Headers for all assets
- [ ] Verify no 304 Not Modified requests (should be 200 from cache)

### 6.3 curl/HTTP Testing
- [ ] Test with curl to verify headers:
  ```bash
  curl -I https://www.bv-brc.org/js/3.56.4/bundle/bundle.js
  curl -I https://www.bv-brc.org/patric/images/bv-brc/bv-brc-header-logo.png
  curl -I https://www.bv-brc.org/public/manifest.json
  ```
- [ ] Verify all expected headers are present
- [ ] Test ETag with conditional request:
  ```bash
  curl -I -H "If-None-Match: <etag-value>" https://www.bv-brc.org/js/3.56.4/bundle/bundle.js
  ```
  Should return 304 Not Modified

### 6.4 Performance Testing
- [ ] Measure page load time before fixes
- [ ] Measure page load time after fixes
- [ ] Verify repeat visits show zero static asset downloads
- [ ] Check Network tab shows all assets as cached on second load

---

## Phase 7: Documentation and Configuration

### 7.1 Document Caching Strategy
- [ ] Create/update documentation explaining caching strategy
- [ ] Document which paths are cached and for how long
- [ ] Document environment-specific behavior
- [ ] **File**: Add to `docs/` directory or `README.md`

### 7.2 Update Configuration Files
- [ ] Review `p3-web.conf.sample` for any caching-related configs
- [ ] Add comments in `app.js` explaining caching strategy
- [ ] Document why certain TTLs were chosen

### 7.3 CDN/Proxy Configuration (if applicable)
- [ ] Verify CDN or reverse proxy respects cache headers
- [ ] Check if any proxy is stripping cache headers
- [ ] Configure CDN to cache based on `Cache-Control` headers
- [ ] Test CDN behavior with new headers

---

## Phase 8: Production Deployment

### 8.1 Pre-Deployment Checklist
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Staging environment tested

### 8.2 Deployment Steps
- [ ] Deploy to staging/alpha first
- [ ] Verify caching works in staging
- [ ] Monitor for any issues
- [ ] Deploy to production
- [ ] Monitor production metrics

### 8.3 Post-Deployment Verification
- [ ] Verify cache headers in production
- [ ] Monitor page load performance
- [ ] Check server logs for any issues
- [ ] Verify CDN/proxy caching behavior

---

## Quick Reference: Expected Cache Headers

### Versioned Assets (e.g., `/js/3.56.4/...`)
```
Cache-Control: public, max-age=30758400, immutable
Expires: <date 1 year in future>
ETag: "<hash>"
Last-Modified: <file modification date>
```

### Long-Term Static Assets (e.g., `/patric/images/...`)
```
Cache-Control: public, max-age=31536000, immutable
Expires: <date 1 year in future>
ETag: "<hash>"
Last-Modified: <file modification date>
```

### Development Unversioned Assets (e.g., `/js/...` in dev)
```
Cache-Control: public, max-age=3600
Expires: <date 1 hour in future>
ETag: "<hash>"
Last-Modified: <file modification date>
```

### HTML/API Responses (should NOT be cached long-term)
```
Cache-Control: no-cache, must-revalidate
Pragma: no-cache
```

---

## Notes

- **Priority**: Phase 1-2 are critical and should be done first
- **Phase 3**: May already be working (Express default behavior)
- **Phase 4**: Important for development workflow
- **Phase 5**: Nice-to-have enhancement for better cache busting
- **Phase 6-8**: Testing and deployment

## Testing Commands

```bash
# Check headers for versioned JS
curl -I http://localhost:3000/js/3.56.4/bundle/bundle.js

# Check headers for images
curl -I http://localhost:3000/patric/images/bv-brc/bv-brc-header-logo.png

# Check headers for public assets
curl -I http://localhost:3000/public/manifest.json

# Test ETag conditional request
ETAG=$(curl -I http://localhost:3000/js/3.56.4/bundle/bundle.js | grep -i etag | cut -d' ' -f2 | tr -d '\r')
curl -I -H "If-None-Match: $ETAG" http://localhost:3000/js/3.56.4/bundle/bundle.js
```

