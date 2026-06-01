# Real-Time Updates Testing Guide

**Date**: April 11, 2026  
**Status**: ✅ READY FOR TESTING

---

## Quick Start (60 seconds)

### 1. Start Services (3 terminals)

**Terminal 1 - Backend**:
```bash
cd C:\pfe-project\backend
node server.js
```
Expected output:
```
Server running on port 5000
Connected to MongoDB
Default thresholds initialized
```

**Terminal 2 - Python Agent**:
```bash
cd C:\pfe-project\agent
python multi_server_agent.py
```
Expected output:
```
Agent started
Monitoring 3 virtual servers
Sending metrics every 5 seconds
```

**Terminal 3 - Frontend**:
```bash
cd C:\pfe-project\frontend
npm start
```
Expected output:
```
Compiled successfully!
You can now view dashboard in the browser.
Local: http://localhost:3000
```

### 2. Open Browser
```
http://localhost:3000
```

### 3. What You Should See
```
Dashboard Header:
├ [Refresh Button] [● Just now]  ← Real-time indicators
├ Main Dashboard
│ ├ server-1 [OK] CPU 47% RAM 60%
│ ├ server-2 [OK] CPU 52% RAM 63%
│ └ server-3 [OK] CPU 40% RAM 51%
│
└ Summary: 3 Healthy, 0 Warnings, 0 Critical
```

---

## Testing Checklist

### ✅ Test 1: Automatic 5-Second Polling

**What to Do**:
1. Open dashboard
2. Wait and watch the server cards
3. Observe metrics changing automatically

**Expected Results**:
```
Timeline:
T=0s:   Dashboard loads with initial metrics
T=5s:   Metrics update (CPU 47.3% → 48.1%)
T=10s:  Metrics update again
T=15s:  Metrics update again
T=20s:  Metrics update again
T=25s:  Metrics update again

Pattern: Changes every 5 seconds ✅
```

**Success Criteria**:
- ✅ Metrics change every 5 seconds
- ✅ No page refresh occurs
- ✅ Smooth animation of progress bars
- ✅ No browser console errors

**Failure Indicators**:
- ❌ Metrics not changing
- ❌ Page refreshing automatically
- ❌ Changes only on manual refresh
- ❌ Console errors like "Failed to fetch"

---

### ✅ Test 2: Real-Time Status Indicator

**What to Do**:
1. Open dashboard
2. Look at the header (top-right area)
3. Watch the green dot and timestamp

**Expected Behavior**:
```
Green Dot (Pulse):
├ Pulsing when active     ← Indicates update happening
├ Steady green between    ← Idle state
└ Red dot if disconnected ← Error state (you shouldn't see this)

Time Display:
├ "Just now"              ← Within 5 seconds of last update
├ "5s ago"                ← 5-10 seconds since update
├ "10s ago"               ← 10-15 seconds since update
└ Auto-updates every second
```

**Success Criteria**:
- ✅ Green dot visible in header
- ✅ Dot pulses when updating
- ✅ Time text changes every second
- ✅ "Just now" appears after update

**Failure Indicators**:
- ❌ No indicator visible
- ❌ Indicator never pulses
- ❌ Time doesn't update
- ❌ Shows red dot

---

### ✅ Test 3: Manual Refresh Button

**What to Do**:
1. Look at refresh button (next to real-time indicator)
2. Click the button
3. Watch metrics update immediately

**Expected Behavior**:
```
Button States:
├ Blue "Refresh" button        ← Normal state, clickable
├ Gray "Updating..." button    ← During fetch, disabled
└ Blue "Refresh" button again  ← After complete

When Clicked:
1. Button shows "Updating..."
2. Spinner animates
3. Metrics fetch from backend
4. Data updates on screen
5. Button returns to "Refresh"
6. Time indicator shows "Just now"
```

**Success Criteria**:
- ✅ Button clickable when idle
- ✅ Shows "Updating..." during fetch
- ✅ Spinner animates while loading
- ✅ Metrics update immediately
- ✅ Button disabled during update
- ✅ Button re-enabled after complete

**Failure Indicators**:
- ❌ Button doesn't respond to clicks
- ❌ Button text doesn't change
- ❌ Spinner doesn't spin
- ❌ Metrics don't update
- ❌ Button never re-enables

---

### ✅ Test 4: Network Traffic Monitoring

**What to Do**:
1. Open Browser DevTools (F12)
2. Click "Network" tab
3. Clear all requests
4. Wait 10 seconds and observe

**Expected Requests**:
```
Timeline in Network tab:

0s:   GET /api/metrics/latest (status 200, ~20ms)
      ├ Response: { count: 3, data: [...] }
      └ Size: ~2KB

5s:   GET /api/metrics/latest (status 200, ~20ms)
      └ (Same pattern repeats)

10s:  GET /api/metrics/latest (status 200, ~20ms)
      └ (Same pattern repeats)

Pattern: One request every ~5 seconds ✅
```

**Success Criteria**:
- ✅ Request to `/api/metrics/latest`
- ✅ Status code 200 (success)
- ✅ Response time < 50ms
- ✅ One request every ~5 seconds
- ✅ Consistent response size (~2KB)
- ✅ No 404 or 500 errors

**Failure Indicators**:
- ❌ No requests visible
- ❌ Status 404 or 500
- ❌ Requests take > 1 second
- ❌ Irregular request patterns
- ❌ Large response sizes (>10KB)

---

### ✅ Test 5: CPU Status Badge Changes

**What to Do**:
1. Monitor CPU percentage
2. Run intensive tasks on a server to spike CPU
3. Watch status badge color change

**Expected Behavior**:
```
CPU < 70%:   Green [OK] badge       ✅
CPU 70-90%:  Yellow [WARNING] badge ⚠️
CPU > 90%:   Red [CRITICAL] badge   🔴

Example Timeline:
T=0s:   CPU 47%   → [OK] green
T=5s:   CPU 75%   → [WARNING] yellow
T=10s:  CPU 95%   → [CRITICAL] red
T=15s:  CPU 65%   → [OK] green
        (All automatic, no manual action needed)
```

**Success Criteria**:
- ✅ Badge colors match CPU percentage ranges
- ✅ Colors update instantly with CPU changes
- ✅ No lag between CPU change and color change
- ✅ All three colors appear as CPU varies

**Failure Indicators**:
- ❌ Wrong color for CPU value
- ❌ Colors don't change when CPU changes
- ❌ Delayed color updates (> 5 seconds)
- ❌ Colors stuck on one state

---

### ✅ Test 6: Progress Bar Animations

**What to Do**:
1. Watch server card progress bars
2. Observe metrics changing
3. See progress bars animate to new widths

**Expected Behavior**:
```
Progress Bar Animation:
    Initial: ▓▓▓▓▓░░░░░░░░░░░░░░░  (47%)
             
    After 5s: ▓▓▓▓▓▓░░░░░░░░░░░░░░  (48%)
    
    Animation: Smooth slide to the right

    Colors Update:
    ├ Green (< 70%)     → Always visible until 70%
    ├ Yellow (70-90%)   → Visible in warning range
    └ Red (> 90%)       → Visible in critical range
```

**Success Criteria**:
- ✅ Progress bars animate smoothly
- ✅ Bar widths match percentages
- ✅ Colors update with thresholds
- ✅ No jerky or instant changes
- ✅ Animation takes ~0.3-0.5 seconds

**Failure Indicators**:
- ❌ Progress bars don't change
- ❌ Instant jumps (no animation)
- ❌ Jerky or stuttering animation
- ❌ Width doesn't match percentage
- ❌ Colors don't match thresholds

---

### ✅ Test 7: Timestamp Updates

**What to Do**:
1. Locate the timestamp under each server card
2. Wait and watch the time update

**Expected Behavior**:
```
Server Card Timestamp:
    Initial: 2:45:32 PM

    After 5s: 2:45:37 PM    (updated)
    
    After 10s: 2:45:42 PM   (updated)

    Pattern: Changes every 5 seconds
```

**Success Criteria**:
- ✅ Timestamp updates every 5 seconds
- ✅ Matches actual server response time
- ✅ All three servers have correct time
- ✅ No timezone issues

**Failure Indicators**:
- ❌ Timestamp never changes
- ❌ Wrong time displayed
- ❌ Inconsistent across servers
- ❌ Time in wrong timezone

---

### ✅ Test 8: Server Selection & History Chart

**What to Do**:
1. Click on a server card
2. Observe chart appears/updates
3. Watch chart data update

**Expected Behavior**:
```
Before Click:
    [server-1 card] [server-2 card] [server-3 card]
    
After Click on server-2:
    [server-1 card] [server-2 card - SELECTED] [server-3 card]
    
    Chart appears below:
    ┌────────────────────────────────┐
    │ CPU/Memory Trend (60 minutes)   │
    │ ▁▂▃▄▅▆▇█▆▇▆▅▄▃▂▁  (CPU line)  │
    │ ▂▃▄▅▆▇█▇▆▅▄▃▂▁▂▃  (RAM line)  │
    └────────────────────────────────┘
```

**Success Criteria**:
- ✅ Chart appears when server selected
- ✅ Chart shows 60-minute history
- ✅ CPU and RAM lines display
- ✅ Chart updates with new real-time data
- ✅ Can switch servers and chart updates

**Failure Indicators**:
- ❌ No chart appears
- ❌ Chart doesn't update
- ❌ Wrong data in chart
- ❌ Switching servers breaks chart
- ❌ Chart shows too much/too little data

---

### ✅ Test 9: Error Handling - Disconnect Backend

**What to Do**:
1. Have dashboard running with updates
2. Stop the backend server (Ctrl+C in backend terminal)
3. Wait 5 seconds
4. Observe error state

**Expected Behavior**:
```
Normal State (before disconnect):
    ├ Green [OK] badges
    ├ Real-time indicator pulsing
    ├ Metrics updating every 5s
    └ "Just now" timestamp

After Backend Disconnects:
    ├ Real-time indicator turns RED ← Error indicator
    ├ Refresh button may still work
    ├ Error message appears: "Failed to fetch latest metrics"
    ├ Old metrics stay visible (graceful degradation)
    └ No timestamp update

When Backend Reconnects:
    ├ Real-time indicator goes GREEN ← OK indicator
    ├ Metrics update again
    ├ Error message disappears
    ├ "Just now" timestamp reappears
    └ Updates resume every 5 seconds
```

**Success Criteria**:
- ✅ Error message appears when disconnected
- ✅ Indicator shows error state (red)
- ✅ Old data stays visible (doesn't blank)
- ✅ Manual refresh still tries to fetch
- ✅ Automatic updates resume when reconnected
- ✅ No page crash or infinite errors

**Failure Indicators**:
- ❌ Page crashes without alert
- ❌ No error message shown
- ❌ Data blanks out completely
- ❌ Continuous error spam in console
- ❌ Updates stuck even after reconnect

---

### ✅ Test 10: Performance - No Memory Leaks

**What to Do**:
1. Open dashboard
2. Let it run for 5 minutes
3. Watch browser memory usage

**Expected Behavior**:
```
Browser Memory (Chrome DevTools):
    
    Start: ~45MB
    
    After 1 min: ~50MB (slight increase)
    
    After 5 min: ~50-52MB (stable)
    
    Pattern: Memory stabilizes, doesn't keep climbing
```

**Success Criteria**:
- ✅ Memory usage stable after first minute
- ✅ No continuous memory increase
- ✅ < 10% memory growth over 5 minutes
- ✅ No console warnings about memory

**Failure Indicators**:
- ❌ Memory keeps climbing (80MB → 150MB)
- ❌ Browser becomes slow/laggy
- ❌ Fan spinning up after a while
- ❌ Chrome warning: "High memory usage"
- ❌ Console shows memory warnings

---

## Test Results Template

Copy and fill in:

```
TEST RESULTS - Real-Time Dashboard
Date: April 11, 2026
Tester: [Your Name]

✅ Test 1: Automatic 5-Second Polling
   Status: PASS / FAIL
   Notes: 

✅ Test 2: Real-Time Status Indicator
   Status: PASS / FAIL
   Notes: 

✅ Test 3: Manual Refresh Button
   Status: PASS / FAIL
   Notes: 

✅ Test 4: Network Traffic Monitoring
   Status: PASS / FAIL
   Notes: 

✅ Test 5: CPU Status Badge Changes
   Status: PASS / FAIL
   Notes: 

✅ Test 6: Progress Bar Animations
   Status: PASS / FAIL
   Notes: 

✅ Test 7: Timestamp Updates
   Status: PASS / FAIL
   Notes: 

✅ Test 8: Server Selection & History Chart
   Status: PASS / FAIL
   Notes: 

✅ Test 9: Error Handling - Disconnect Backend
   Status: PASS / FAIL
   Notes: 

✅ Test 10: Performance - No Memory Leaks
   Status: PASS / FAIL
   Notes: 

Overall Status: ALL PASS / PARTIAL / FAIL
Issues Found: [List here]
Ready for Production: YES / NO
```

---

## Debugging Tips

### Metrics Not Updating?

**Check 1**: Is backend running?
```bash
ps aux | grep node  # On Linux
tasklist | find "node"  # On Windows
```

**Check 2**: Is agent sending metrics?
```bash
# Terminal output should show:
# "Sending metrics every 5 seconds"
```

**Check 3**: Check browser console (F12)
```javascript
// Look for errors like:
// ❌ "Failed to fetch /api/metrics/latest"
// ❌ "Cannot read property 'data'"
// ✅ No errors = healthy
```

### Polling Not Every 5 Seconds?

**Check Network Tab**:
```
DevTools → Network → Filter by "metrics"
Count requests in 30 seconds: Should be ~6 requests
(30 / 5 = 6 request per 30 seconds)
```

### Real-Time Indicator Not Showing?

**Check 1**: Location
```
Header, top-right corner
├ Right side: [Refresh] [● Recent Time]
```

**Check 2**: Console
```
F12 → Console tab
Look for: "[React] Component RealtimeIndicator rendered"
No errors about component
```

### Manual Refresh Not Working?

**Check**: Network tab
- Click refresh button
- Should see GET request to `/api/metrics/latest`
- Should complete within 50ms
- Status should be 200

---

## Performance Benchmarks

### Expected Response Times
```
Endpoint              | Expected | Max Acceptable
/api/metrics/latest   | 20ms     | 50ms
/api/metrics/history  | 40ms     | 100ms
Manual refresh        | 20-50ms  | 100ms
```

### Expected UI Performance
```
Metric                          | Expected | Max
FPS (frames per second)         | 60 FPS   | 30 FPS
Progress bar animation duration | 300ms    | 500ms
Timestamp update frequency      | 1/sec    | 2/sec
Memory growth (5 min run)       | <10%     | <20%
```

---

## Success Criteria Summary

✅ **Automatic Updates**: Metrics change every 5 seconds  
✅ **Real-Time Indicators**: Green pulse + timestamp  
✅ **Manual Refresh**: Button works instantly  
✅ **Network Efficient**: 1 call per 5 seconds  
✅ **Smooth Animations**: Progress bars animate  
✅ **Status Colors**: Update with CPU threshold  
✅ **Error Handling**: Graceful degradation  
✅ **Memory Stable**: No memory leaks  
✅ **No Page Refresh**: Pure client-side updates  
✅ **High Performance**: < 50ms response times  

---

## Quick Troubleshooting Table

| Problem | Solution |
|---------|----------|
| Metrics not updating | Check backend running: `node server.js` |
| Polling not every 5s | Check Network tab timing |
| Button doesn't work | Check console for errors |
| Red indicator appears | Restart backend server |
| Memory increasing | Close and reopen dashboard |
| Chart not showing | Click on a server card |
| Time indicator frozen | Check `RealtimeIndicator.js` running |
| 404 errors | Verify backend endpoints exist |
| Slow responses | Check server load (CPU usage) |
| Browser lag | Check memory in DevTools |

---

Next: Start services and run Test 1 to verify real-time polling! 🚀
