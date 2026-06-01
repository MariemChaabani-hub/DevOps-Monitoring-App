# Real-Time Alert System

**Date**: April 11, 2026  
**Status**: ✅ IMPLEMENTED

---

## Overview

Your React dashboard now displays **real-time alerts** with:
- ✅ Alert panel showing active alerts from backend
- ✅ Severity color coding (WARNING → Orange, CRITICAL → Red)
- ✅ Notification popups for new alerts
- ✅ Alert management (acknowledge/resolve)
- ✅ 10-second polling for alerts

---

## Features Implemented

### 1. Alert Display Panel

**Location**: Bottom of dashboard

**Displays**:
- All active alerts with severity badges
- Status (ACTIVE, ACKNOWLEDGED, RESOLVED)
- Server, timestamp, and metric details
- Expandable alert details with metrics

**Severity Color Coding**:
```
CRITICAL → Red background (#F44336)
  └─ Requires immediate action
  └─ Example: CPU > 90%

WARNING → Orange background (#FFC107)
  └─ Requires monitoring
  └─ Example: CPU 70-90%

INFO → Blue background
  └─ Informational only
```

### 2. Notification Popups

**Trigger**: When a new alert arrives (not seen before)

**Behavior**:
- Appears in top-right corner
- Shows alert severity, message, server
- Auto-dismisses after 5 seconds
- Can be manually closed with X button
- Color-coded by severity

**Notification Animations**:
```
┌────────────────────────────┐
│ 🔴 CRITICAL Alert          │  ← Slides in from right
│ Server: server-1           │  ← Shows message
│ CPU exceeded threshold     │  ← Auto-dismisses after 5s
│                          X │  ← Manual close button
├────────────────────────────┤
│▓▓▓▓▓░░░░  Progress bar    │  ← Shrinks as time passes
└────────────────────────────┘
```

### 3. Alert Management

**Acknowledge Alert** (Mark as seen):
```
ACTIVE alert → Click "Acknowledge" → Status becomes "ACKNOWLEDGED"
↓
Alert stays in list but marked as reviewed
↓
Later resolve when issue is fixed
```

**Resolve Alert** (Issue fixed):
```
ACKNOWLEDGED alert → Click "Resolve" → Status becomes "RESOLVED"
Or
ACTIVE alert → Click "Resolve" → Status becomes "RESOLVED"
↓
Alert removed from active list
```

### 4. Real-Time Polling

**Frequency**:
- Alerts: Every 10 seconds (less frequent than metrics)
- Metrics: Every 5 seconds

**Why Different Frequencies?**:
- Metrics change rapidly → need 5-second updates
- Alerts are state changes → 10-second updates are sufficient
- Reduces API load while maintaining responsiveness

---

## Component Architecture

### AlertsPanel.js
Displays active alerts with expandable details

**Props**:
```javascript
{
  alerts: Array<Alert>,           // Array of alert objects
  onAcknowledge: Function,        // Callback for acknowledge action
  onResolve: Function,            // Callback for resolve action
  loading: Boolean                // Loading state for spinner
}
```

**Alert Object Structure**:
```javascript
{
  _id: "alert-id",              // MongoDB ObjectId
  message: "CPU usage high",    // Alert message
  severity: "CRITICAL",         // CRITICAL, WARNING, INFO
  status: "ACTIVE",             // ACTIVE, ACKNOWLEDGED, RESOLVED
  server_id: "server-1",        // Server identifier
  metric_value: 92.5,           // Current metric value
  threshold: 90,                // Alert threshold
  details: "Details...",        // Optional details
  created_at: "2026-04-11...",  // Creation timestamp
  acknowledged_at: null,        // Acknowledgment timestamp
  resolved_at: null             // Resolution timestamp
}
```

### NotificationPopup.js
Shows popup notification for new alerts

**Props**:
```javascript
{
  alert: Alert,           // Alert object to display
  onClose: Function,      // Callback when notification closes
  duration: Number        // Auto-close duration in ms (default 5000)
}
```

**Features**:
- Animated slide-in from right
- Progress bar showing time remaining
- Auto-dismiss after duration
- Manual close button
- Color-coded by severity

### Dashboard.js Integration
Manages alert fetching and state

**Key Functions**:
```javascript
fetchAlerts()              // Fetch active alerts from API
handleAcknowledgeAlert()   // Acknowledge alert and refresh
handleResolveAlert()       // Resolve alert and refresh
```

**State Variables**:
```javascript
[alerts]                   // Array of active alerts
[activeNotification]       // Current notification popup
[previousAlertIds]         // Track to detect new alerts
```

---

## API Integration

### Backend Endpoints Used

**Fetch Alerts**:
```
GET /api/alerts?status=ACTIVE&limit=50
```

**Response**:
```json
[
  {
    "_id": "alert-id",
    "message": "CPU usage exceeded threshold",
    "severity": "CRITICAL",
    "status": "ACTIVE",
    "server_id": "server-1",
    "metric_value": 92.5,
    "threshold": 90,
    "created_at": "2026-04-11T14:30:00Z",
    ...
  }
]
```

**Acknowledge Alert**:
```
PUT /api/alerts/{alertId}/acknowledge
Body: { "acknowledged_by": "dashboard-user" }
```

**Resolve Alert**:
```
PUT /api/alerts/{alertId}/resolve
Response: Updated alert object with status: "RESOLVED"
```

---

## User Workflow

### Scenario: CPU Alert on server-1

**Timeline**:

```
T=0s:    Python agent detects server-1 CPU is 92% (> 90% threshold)
         Backend generates CRITICAL alert

T=10s:   Dashboard polls /api/alerts every 10 seconds
         Alert received for first time
         activeNotification is set
         NotificationPopup appears in top-right

         ┌────────────────────────────┐
         │ 🔴 CRITICAL Alert          │
         │ Server: server-1           │
         │ CPU exceeded threshold     │
         │ (Auto-dismisses in 5s)     │
         └────────────────────────────┘

T=15s:   Notification auto-dismisses
         Alert still visible in AlertsPanel below
         Status: ACTIVE (red badge)

T=20s    User expands alert details in panel to view metrics
         Sees: Current: 92.5%, Threshold: 90%
         
T=25s:   User clicks "Acknowledge" button
         Alert status changes to ACKNOWLEDGED
         Background: API call to /api/alerts/{id}/acknowledge
         Badge changes to purple

T=60s:   Server CPU drops to 68%
         Python agent resolves old alert
         Backend updates alert status to RESOLVED

T=70s:   Dashboard fetches alerts
         RESOLVED alerts hidden from active list
         Alert removed from view

T=80s:   Next polling cycle
         No active alerts shown
         AlertsPanel shows: "No active alerts"
```

---

## Visual Appearance

### Alert Panel - No Alerts
```
┌─ Alerts ────────────────────────┐
│                                │
│          ✓ All Systems         │
│      No active alerts          │
│                                │
└────────────────────────────────┘
```

### Alert Panel - Active Alerts
```
┌─ Alerts ────────── 2 Active ────┐
│                                │
│ [CRITICAL] [ACTIVE]           │
│ ⚠️  High CPU Usage             │
│ Server: server-1              │
│ 2:45:30 PM                    │
│ ▼ (click to expand)           │
│                                │
│ Current: 92.5%                │
│ Threshold: 90%                │
│ [Acknowledge] [Resolve]       │
│                                │
├────────────────────────────────┤
│ [WARNING] [ACTIVE]            │
│ ⚡ Memory Usage High           │
│ Server: server-2              │
│ 2:45:20 PM                    │
│ ▼ (click to expand)           │
└────────────────────────────────┘
```

### Notification Popup
```
┌─────────────────────────────┐
│ 🔴 CRITICAL Alert        X  │
│ Server: server-1            │
│ CPU exceeded threshold      │
├─────────────────────────────┤
│▓▓▓▓▓▓▓▓░░  (progress)  │
└─────────────────────────────┘
  (Auto-closes in 5 seconds)
```

---

## Severity Guide

### CRITICAL (Red) 🔴
- **Color**: `bg-red-900`, border `border-red-700`
- **When**: Metric exceeds critical threshold
- **Action Required**: IMMEDIATE
- **Example**: CPU > 90%, Memory > 95%, Disk > 98%
- **Impact**: System operational integrity at risk

### WARNING (Orange) ⚠️
- **Color**: `bg-orange-900`, border `border-orange-700`
- **When**: Metric at warning threshold
- **Action Required**: MONITOR CLOSELY
- **Example**: CPU 70-90%, Memory 80-95%, Disk 85-98%
- **Impact**: System approaching limits

### INFO (Blue) ℹ️
- **Color**: `bg-blue-900`, border `border-blue-700`
- **When**: Informational events
- **Action Required**: INFORMATIONAL
- **Example**: Maintenance scheduled, service restarted
- **Impact**: No immediate impact

---

## Integration with Metrics

### Relationship to Server Cards
- **Metrics**: Real-time values (5-second polling)
- **Alerts**: State changes (10-second polling)
- **Both**: Updated independently for best performance

### Example - CPU Alert to Resolution
```
Dashboard Metrics          Dashboard Alerts
─────────────────          ────────────────

Server-1: 65% CPU    →     No alert
Server-1: 75% CPU    →     WARNING alert generated
Server-1: 88% CPU    →     WARNING continues
Server-1: 92% CPU    →     CRITICAL alert generated
Server-1: 95% CPU    →     CRITICAL continues
Server-1: 88% CPU    →     CRITICAL stays (no auto-resolve)
Server-1: 65% CPU    →     (still showing - user must resolve)

User action:
                           Click "Resolve" button
                           Alert status → RESOLVED
                           Alert removed from active list
```

---

## Error Handling

### Backend Connection Lost
```
Console Error: "Error fetching alerts: ..."
Result:
├─ Alerts panel shows "No active alerts"
├─ No notification popups
└─ Polling continues every 10 seconds
   (Will recover when connection restored)
```

### Acknowledge/Resolve Fails
```
User clicks "Acknowledge"
      ↓
API call fails
      ↓
Console error shown
      ↓
Button remains enabled
      ↓
User can retry
```

---

## Configuration

### Polling Frequency
**Current**: 10 seconds for alerts

**To Change**, edit Dashboard.js:
```javascript
const interval = setInterval(() => {
  fetchAlerts();
}, 10000);  // Change 10000 to desired milliseconds
```

### Notification Duration
**Current**: 5 seconds

**To Change**, edit where NotificationPopup is called:
```javascript
<NotificationPopup
  alert={activeNotification}
  onClose={() => setActiveNotification(null)}
  duration={7000}  // Change to desired milliseconds
/>
```

### Max Alerts Displayed
**Current**: 50 alerts

**To Change**, edit fetchAlerts in Dashboard.js:
```javascript
const response = await axios.get(
  `${API_BASE}/api/alerts?status=ACTIVE&limit=100`  // Change 50 to desired
);
```

---

## Testing the Alert System

### Test 1: View Alerts
1. Open dashboard
2. Scroll to bottom to see Alerts Panel
3. If no alerts: See "No active alerts" message
4. If alerts exist: See list with severity colors

### Test 2: New Alert Notification
1. Have dashboard open
2. Trigger high CPU on a server (run stress test)
3. Watch for popup in top-right corner
4. Popup auto-dismisses after 5 seconds

### Test 3: Acknowledge Alert
1. Click alert in panel to expand
2. Click "Acknowledge" button
3. Badge changes from ACTIVE to ACKNOWLEDGED
4. Status button changes color
5. Refresh shows updated status

### Test 4: Resolve Alert
1. Click alert in panel to expand
2. Click "Resolve" button
3. Alert disappears from active list
4. List updates in real-time

### Test 5: Alert Details
1. Click alert to expand
2. See expanded details with:
   - Current metric value
   - Threshold value
   - Creation timestamp
   - Action buttons

---

## Architecture Diagram

```
Backend                          Frontend
────────                        ───────────

        Alert Generated
        (CPU > 90%)
             │
             ▼
    GET /api/alerts
    (every 10 seconds)
             │
             ▼
         Dashboard.js
             │
    ┌────────┴────────┐
    ▼                 ▼
AlertsPanel      NotificationPopup
(List display)    (New alerts popup)
    │
    ├─ Severity color coding
    ├─ Expandable details
    ├─ Acknowledge button
    └─ Resolve button
```

---

## Summary

✅ **Real-Time Alerts**: Updated every 10 seconds  
✅ **Severity Colors**: CRITICAL (red) & WARNING (orange)  
✅ **Notifications**: Popup for new alerts  
✅ **Management**: Acknowledge and resolve actions  
✅ **Dashboard Integration**: Seamless integration with metrics  
✅ **Visual Feedback**: Color-coded badges and status  

Your dashboard now provides **comprehensive alert monitoring** for your infrastructure! 🚀
