# SSE Connection Debugging Guide

## How to Verify the SSE Connection is Working

### 1. Browser Console Logs

With the updated code, you should now see detailed console logs when you submit a query:

```
[SSE] Initiating stream request to: http://your-api/copilot-agent
[SSE] Request data: {query: "...", model: "...", ...}
[SSE] Response received, status: 200 headers: Headers {}
[SSE] Starting to read stream...
[SSE] Chunk received, size: 123 bytes
[SSE] Event type: queued
[SSE] Raw data received: {"job_id":"123","session_id":"abc",...}
[SSE] Parsed data: {job_id: "123", session_id: "abc", ...}
Job queued: {job_id: "123", ...}
[SSE] Event type: started
[SSE] Raw data received: {"job_id":"123",...}
[SSE] Parsed data: {job_id: "123", ...}
Processing started: {job_id: "123", ...}
[SSE] Event type: content
[SSE] Raw data received: {"chunk":"Hello"}
[SSE] Parsed data: {chunk: "Hello"}
[SSE] Event type: done
[SSE] Parsed data: {session_id: "abc", iterations: 3, ...}
Processing complete: {iterations: 3, ...}
[SSE] Stream ended
```

**If you DON'T see these logs:**
- The request might not be reaching the backend
- Check network connectivity
- Verify the API URL is correct

---

### 2. Browser Network Tab (Chrome/Firefox DevTools)

**Steps:**
1. Open DevTools (F12 or Right-click → Inspect)
2. Go to the **Network** tab
3. Submit a query in the Copilot chat
4. Look for the request to `/copilot-agent`

**What to check:**

#### Request Details:
- **Method**: POST
- **Status**: 200 (should stay open/pending while streaming)
- **Type**: Should show `eventsource` or `text/event-stream`
- **Headers**:
  - `Accept: text/event-stream`
  - `Content-Type: application/json`
  - `Cache-Control: no-cache`

#### Response:
- Click on the request → **Response** tab
- You should see the SSE stream data appearing in real-time:
  ```
  event: queued
  data: {"job_id":"123",...}

  event: started
  data: {"job_id":"123",...}

  event: content
  data: {"chunk":"Hello"}
  ```

**If the connection closes immediately:**
- The backend might not be streaming properly
- Check backend logs for errors

---

### 3. Check Backend Format

The backend MUST send data in this exact SSE format:

```
event: content
data: {"chunk":"Hello"}

event: progress
data: {"iteration":1,"percentage":25}

event: done
data: {"session_id":"abc"}

```

**Important SSE Rules:**
- Each event has TWO lines: `event: type` and `data: json`
- BLANK LINE after each event (double newline `\n\n`)
- Heartbeats are comments: `: heartbeat\n\n`

---

### 4. Common Issues & Solutions

#### Issue: No [SSE] logs in console
**Solution:** Make sure you're using the updated `CopilotApi.js` file. Check that the browser cache is cleared (hard refresh: Ctrl+Shift+R or Cmd+Shift+R).

#### Issue: "Response received" but no chunks
**Solution:** The backend might not be sending data. Check:
- Backend is using correct SSE format
- Response headers include `Content-Type: text/event-stream`
- Backend is flushing the stream after each event

#### Issue: Old format still being used
**Solution:** The backend might be sending the old format. Check backend code to ensure it's using the new Bull queue format with named events.

#### Issue: Only seeing raw text, no event types
**Solution:** Backend is not sending `event:` lines. It should send:
```
event: content
data: {"chunk":"text"}

```
NOT just:
```
data: {"chunk":"text"}

```

---

### 5. Test with curl

You can test the backend directly from terminal:

```bash
curl -N -X POST http://your-api/copilot-agent \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "Authorization: YOUR_TOKEN" \
  -d '{
    "query": "test",
    "model": "your-model",
    "session_id": "test-session",
    "user_id": "test-user"
  }'
```

You should see SSE events streaming in real-time.

---

### 6. Verify Backend is Using Bull Queue

Check that your backend is:
1. Using Bull queue for job processing
2. Emitting SSE events via response stream
3. Sending named events (queued, started, progress, content, done, error)
4. Using proper SSE format with `event:` and `data:` lines

---

### 7. Quick Debug Snippet

Add this to your browser console while streaming:

```javascript
// Monitor all fetch requests
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('FETCH:', args[0], args[1]);
  return originalFetch.apply(this, args);
};
```

Then submit a query and you'll see the fetch call details.

---

## Expected Flow

1. User submits query
2. `[SSE] Initiating stream request` log appears
3. `[SSE] Response received` with status 200
4. `[SSE] Starting to read stream...`
5. Multiple `[SSE] Chunk received` logs
6. `[SSE] Event type:` logs for each event (queued, started, progress, content, done)
7. Progress callbacks fire (shown in console)
8. Content appears in chat UI
9. `[SSE] Stream ended` when complete

---

## Still Not Working?

If you've checked all of the above and still don't see proper SSE events:

1. **Check backend logs** - Is the backend receiving the request?
2. **Verify backend code** - Is it using the Bull queue SSE format?
3. **Test backend directly** - Use curl or Postman to test the endpoint
4. **Check for proxy/nginx issues** - Some proxies buffer SSE streams
5. **Verify CORS** - Make sure CORS headers allow streaming
6. **Check Content-Type** - Backend must send `text/event-stream`

---

## Contact

If you need help debugging, share:
1. Console logs (all [SSE] prefixed lines)
2. Network tab screenshot (showing the request details)
3. Backend logs
4. curl test results

