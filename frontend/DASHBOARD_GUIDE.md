# Professional React Dashboard - Setup & Deployment Guide

## Overview

A professional DevOps-style real-time monitoring dashboard built with React, TailwindCSS, and Recharts.

### Features ✨

**Multi-Server Monitoring**
- Display multiple servers with individual metric cards
- Real-time status indicators (OK/WARNING/CRITICAL)
- Live updates every 5 seconds

**Server Metrics Display**
- CPU Usage % (with color-coded progress bars)
- Memory (RAM) Usage %
- Disk Usage %
- Network I/O stats
- Server uptime
- Last update timestamp

**Smart Status Indicators**
- 🟢 OK: CPU < 70%
- 🟡 WARNING: CPU 70-90%
- 🔴 CRITICAL: CPU > 90%

**Interactive Charts**
- CPU and RAM trends over time
- Last 12 data points (60 seconds of history)
- Area charts with gradient colors
- Tooltip on hover with exact values

**System Summary**
- Total servers count
- Healthy server count
- Warning state servers
- Critical servers (real-time)

---

## Installation

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

This installs:
- `axios` - HTTP client for API calls
- `recharts` - Charts library
- `tailwindcss` - Utility-first CSS framework
- `postcss` - CSS processor
- `autoprefixer` - Browser compatibility

### Step 2: Start the Frontend

```bash
npm start
```

Development server runs at: **http://localhost:3000** (React app)
Make sure backend is running at: **http://localhost:3000** (Node.js backend)

> **Note**: React will use port 3000 by default. If it's in use, it will prompt for a different port.

### Step 3: Verify Backend Connection

The dashboard expects these backend API endpoints:

```
GET  /api/servers              - List all servers
GET  /api/servers/:id/metrics  - Get server metrics (with ?limit=50 for history)
```

Check the backend is running:
```bash
cd backend
npm start
```

---

## Project Structure

```
frontend/src/
├── components/
│   ├── Dashboard.js       - Main dashboard component
│   ├── ServerCard.js      - Individual server metric card
│   ├── MetricsChart.js    - CPU/RAM trend charts
│   └── StatusBadge.js     - Status indicator badge
├── App.js                 - App root (uses Dashboard)
├── App.css                - Global styles
├── index.js               - React entry point
└── index.css              - Tailwind imports + base styles

root/
├── package.json           - Updated with axios, recharts, tailwindcss
├── tailwind.config.js     - Tailwind configuration
├── postcss.config.js      - PostCSS configuration
```

---

## How It Works

### Data Flow

```
Dashboard Component
    ↓
useEffect (on mount)
    ↓
fetchServers() → GET /api/servers
    ↓
  Populate servers list + select first server
    ↓
useEffect (when servers loaded)
    ↓
fetchAllMetrics() → GET /api/servers/{id}/metrics
    ↓
  Store metrics in metricsMap by serverId
    ↓
setInterval(fetchAllMetrics, 5000)
    ↓
Every 5 seconds: Refresh all server metrics
```

### Component Hierarchy

```
App
  └─ Dashboard
      ├─ ServerCard (multiple)
      │   ├─ StatusBadge
      │   └─ Progress bars (CPU, RAM, Disk)
      ├─ MetricsChart
      │   └─ Recharts AreaChart
      └─ Summary Stats
```

### State Management

**Dashboard Component State:**
- `servers` - Array of server objects from API
- `metricsMap` - Object mapping serverId → metrics array
- `loading` - Loading state
- `error` - Error messages
- `selectedServer` - Currently selected server for detail view
- `lastUpdate` - Last API update timestamp

---

## Features in Detail

### 1. Multi-Server Cards

Each server displays:
- **Server ID** - Server identifier
- **Status Badge** - Color-coded status (OK/WARNING/CRITICAL)
- **Last Updated** - Timestamp of latest metric
- **Progress Bars** - Visual representation of usage
  - CPU %
  - RAM %
  - Disk %
- **Additional Stats**
  - Network I/O (B/s)
  - Uptime (hours)

**Interaction:**
- Click any server card to select it for detailed view
- Selected card has blue ring border
- Charts update to show selected server's history

### 2. Real-Time Charts

**Metrics Displayed:**
- CPU Usage (%) - Red color
- RAM Usage (%) - Blue color

**Chart Features:**
- Area chart with gradient fill
- Last 12 data points (60 seconds @ 5s intervals)
- X-axis: Timestamps
- Y-axis: 0-100% scale
- Interactive tooltip on hover
- Legend showing metric names

### 3. System Summary Dashboard

**Summary Stats:**
- **Total Servers** - Count of all monitored servers
- **Healthy Servers** - Servers with CPU < 70%
- **Warning Servers** - Servers with CPU 70-90%
- **Critical Servers** - Servers with CPU > 90%

Updates in real-time as metrics change.

### 4. Status Logic

```javascript
CPU < 70%   → OK       (🟢 Green)
CPU 70-90%  → WARNING  (🟡 Yellow)
CPU > 90%   → CRITICAL (🔴 Red)
```

Applied to:
- Server card status badge
- Progress bar colors
- Summary stats calculations

---

## Styling with TailwindCSS

### Color Scheme

**Dark Mode (Professional DevOps Look)**
- Background: `bg-gray-900` (very dark)
- Card: `bg-gray-800` (dark gray)
- Text: `text-gray-100` (light)
- Borders: `border-gray-700` (subtle)

**Status Colors**
- OK: `bg-green-600` / `text-green-500`
- WARNING: `bg-yellow-600` / `text-yellow-500`
- CRITICAL: `bg-red-600` / `text-red-500`

**Accent Colors** (Charts)
- CPU: `#ef4444` (red)
- RAM: `#3b82f6` (blue)
- Disk: `#f59e0b` (amber)

### Responsive Design

**Breakpoints:**
```css
/* Mobile */
grid-cols-1

/* Tablet (md) */
md:grid-cols-2

/* Desktop (lg) */
lg:grid-cols-3
```

Server cards adapt to:
- 1 column on mobile
- 2 columns on tablet
- 3 columns on desktop

---

## API Endpoints Used

### Get All Servers
```bash
GET /api/servers
```

**Response:**
```json
[
  {
    "_id": "...",
    "serverId": "server-1",
    "hostname": "...",
    "ip": "..."
  }
]
```

### Get Server Metrics
```bash
GET /api/servers/{serverId}/metrics?limit=50
```

**Response:**
```json
[
  {
    "_id": "...",
    "serverId": "server-1",
    "cpu_percent": 45.5,
    "ram_percent": 60.2,
    "disk_percent": 35.1,
    "network_in": 1024,
    "network_out": 2048,
    "uptime": 86400,
    "timestamp": "2026-04-10T15:30:00Z"
  }
]
```

---

## Customization

### Change Refresh Interval

Edit `Dashboard.js`, line ~90:
```javascript
// Current: 5 seconds
const interval = setInterval(fetchAllMetrics, 5000);

// Change to 10 seconds
const interval = setInterval(fetchAllMetrics, 10000);
```

### Change Status Thresholds

Edit `ServerCard.js`, line ~35:
```javascript
// Current thresholds
if (cpu > 90) { status = 'CRITICAL'; }        // > 90%
else if (cpu > 70) { status = 'WARNING'; }    // 70-90%

// Custom thresholds
if (cpu > 85) { status = 'CRITICAL'; }        // > 85%
else if (cpu > 60) { status = 'WARNING'; }    // 60-85%
```

### Change Colors

Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      'status-ok': '#10b981',       // Green
      'status-warning': '#f59e0b',  // Amber
      'status-critical': '#ef4444'  // Red
    }
  }
}
```

### Add New Metrics

Edit `MetricsChart.js` to add more lines:
```javascript
<Area
  type="monotone"
  dataKey="disk_percent"
  stroke="#f59e0b"
  name="Disk %"
/>
```

Edit `ServerCard.js` to display in card:
```javascript
<div>
  <label>Network Usage</label>
  <span>{(latestMetric.network_in || 0).toLocaleString()} B/s</span>
</div>
```

---

## Troubleshooting

### "Failed to fetch servers" Error

**Problem:** Backend not running or API unreachable

**Solution:**
```bash
# Check if backend is running
cd backend
npm start

# Verify at http://localhost:3000/api/servers in browser
```

### Dashboard shows "No servers found"

**Problem:** No servers registered in backend

**Solution:**
1. Start the Python agent to send metrics
2. Agent creates server automatically on first metric
3. Refresh browser after agent sends data

### Charts show no data

**Problem:** Not enough metric history

**Solution:**
- Wait 60 seconds for 12 data points
- Charts appear after 5+ metrics received

### Styles not loading (Tailwind not working)

**Problem:** Tailwind CSS not compiled

**Solution:**
```bash
# Reinstall dependencies
npm install

# Restart dev server
npm start

# Clear browser cache (Ctrl+Shift+Delete)
```

---

## Performance Optimization

### Current Performance

- Update interval: 5 seconds
- Metrics history: 12 items (60 seconds)
- Server limit: No limit (adjust if > 100 servers)

### Optimization Tips

**For many servers (50+):**
```javascript
// Dashboard.js - Limit metrics fetch
fetchServerMetrics(id); // Change limit parameter
GET /api/servers/${serverId}/metrics?limit=20  // Fewer points
```

**For slower networks:**
```javascript
// Increase update interval
setInterval(fetchAllMetrics, 10000); // 10 seconds instead of 5
```

---

## Deployment

### Build for Production

```bash
npm run build
```

Creates optimized build in `frontend/build/` directory.

### Serve Production Build

```bash
# Install serve package
npm install -g serve

# Serve the build
serve -s build -l 3000
```

### Docker Deployment (Optional)

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npx", "serve", "-s", "build", "-l", "3000"]
```

Build and run:
```bash
docker build -t pfe-dashboard .
docker run -p 3000:3000 pfe-dashboard
```

---

## Browser Support

✅ Modern browsers with ES6 support:
- Chrome/Edge 60+
- Firefox 60+
- Safari 12+

---

## Files Modified/Created

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modified | Added axios, recharts, tailwindcss |
| `tailwind.config.js` | Created | Tailwind configuration |
| `postcss.config.js` | Created | PostCSS configuration |
| `src/index.css` | Modified | Added Tailwind directives |
| `src/App.js` | Modified | Updated to use Dashboard |
| `src/App.css` | Modified | Simplified styles |
| `src/components/Dashboard.js` | Created | Main dashboard |
| `src/components/ServerCard.js` | Created | Server metric card |
| `src/components/MetricsChart.js` | Created | CPU/RAM charts |
| `src/components/StatusBadge.js` | Created | Status indicator |

---

## Next Steps

1. ✅ **Install & Run**
   ```bash
   npm install
   npm start
   ```

2. ✅ **Start Backend** (in another terminal)
   ```bash
   cd backend
   npm start
   ```

3. ✅ **Run Agent** (in another terminal)
   ```bash
   cd agent
   python main.py
   ```

4. ✅ **View Dashboard**
   - Open http://localhost:3000 in browser
   - Watch metrics update every 5 seconds
   - Click servers to see detailed charts

5. 📊 **Monitor Your System**
   - Check status colors
   - Review trends in charts
   - React to alerts automatically

---

## Support

For issues:
1. Check browser console (F12) for errors
2. Verify backend is running and API endpoints work
3. Check network tab (F12 → Network) for API calls
4. Review server.js logs for API issues
