# Backup Alert System - Quick Test Guide

## 🚀 Quick Start

### 1. Start Backend
```bash
cd backend
npm install  # First time only
npm start
```

Look for these startup logs:
```
[Backup Cron] Daily backup job scheduled for 00:00 every day
[Late Backup Check] Hourly late backup check scheduled
```

### 2. Start Frontend (optional, for UI testing)
```bash
cd frontend
npm install  # First time only
npm start
```

---

## ✅ Test 1: Failed Backup Alert

### Action: Trigger a failed backup
```bash
curl -X POST http://localhost:5000/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-001",
    "date": "2026-05-03T14:00:00Z",
    "status": "FAILED",
    "duration": 0,
    "size": 0
  }'
```

### Expected Backend Output:
```
[Backups API] POST /api/backups - Created backup: [mongodb-id]
[BackupAlert] Checking backup for server-001: status=FAILED
[BackupAlert] ✓ Found existing ACTIVE BACKUP_FAILED alert for server-001
[BackupAlert] ✓ No existing ACTIVE backup alert for server-001 - will create new alert
[BackupAlert] ✓ Created CRITICAL alert for server-001: Backup failed on [server-name]
[Email] CRITICAL Backup Alert - DEMO MODE (real email disabled):
  To: mariemchaabani39@gmail.com
  Server: server-001
  Status: FAILED
  Message: Backup failed on [server-name]
  Time: 2026-05-03T14:00:00.000Z
```

### Check Database:
```bash
# MongoDB console
mongo devops_db
db.alerts.find({ serverId: "server-001", type: "BACKUP_FAILED" }).pretty()

# Should show:
# {
#   "_id": ObjectId(...),
#   "serverId": "server-001",
#   "type": "BACKUP_FAILED",
#   "severity": "CRITICAL",
#   "status": "ACTIVE",
#   "metric": "backup_status",
#   "message": "Backup failed on server-001",
#   ...
# }
```

---

## ✅ Test 2: Late Backup Alert

### Action: Trigger late backup check
```bash
curl -X POST http://localhost:5000/api/backups/test/check-late
```

### Expected Backend Output:
```
[Late Backup Check] Running hourly check at 2026-05-03T14:15:00.000Z
[Late Backup Check] Checking 3 servers for missing backups
[Late Backup Check] Server server-001: Created LATE backup entry
[BackupAlert] Checking backup for server-001: status=LATE
[BackupAlert] ✓ No existing ACTIVE backup alert for server-001 - will create new alert
[BackupAlert] ✓ Created WARNING alert for server-001: Backup is missing or late on server-001
[Email] Skipping non-CRITICAL backup alert (WARNING) - logging only
  Server: server-001 | Status: LATE | Message: Backup is missing or late on server-001
[Late Backup Check] Completed - 1 LATE backup entries created
```

### UI Impact:
- React BackupMonitoring component shows orange badge (LATE status)
- BackupStatusIndicator displays large orange circle with exclamation mark
- Last update timestamp refreshes in real-time

---

## ✅ Test 3: Duplicate Prevention

### Action: Create two failed backups in rapid succession
```bash
# First failed backup
curl -X POST http://localhost:5000/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-002",
    "date": "2026-05-03T14:20:00Z",
    "status": "FAILED",
    "duration": 0,
    "size": 0
  }'

# Sleep 1 second

# Second failed backup
curl -X POST http://localhost:5000/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-002",
    "date": "2026-05-03T14:21:00Z",
    "status": "FAILED",
    "duration": 0,
    "size": 0
  }'
```

### Expected Backend Output:

**First Call (Alert Created):**
```
[Backups API] POST /api/backups - Created backup: [id1]
[BackupAlert] Checking backup for server-002: status=FAILED
[BackupAlert] ✓ No existing ACTIVE backup alert for server-002 - will create new alert
[BackupAlert] ✓ Created CRITICAL alert for server-002: Backup failed...
[Email] CRITICAL Backup Alert - DEMO MODE...
```

**Second Call (Duplicate Prevented):**
```
[Backups API] POST /api/backups - Created backup: [id2]
[BackupAlert] Checking backup for server-002: status=FAILED
[BackupAlert] ✓ Found existing ACTIVE BACKUP_FAILED alert for server-002
[BackupAlert] ⊘ Skipping duplicate: ACTIVE BACKUP_FAILED alert already exists for server-002
  (Will create new alert only if current alert is RESOLVED)
```

### Result:
- ✅ Only ONE email sent (not two)
- ✅ Only ONE alert record created in database
- ✅ Prevents alert spam

---

## ✅ Test 4: Auto-Resolution

### Action: Create failed backup, then successful backup
```bash
# Create failed backup (should trigger alert)
curl -X POST http://localhost:5000/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-003",
    "date": "2026-05-03T14:30:00Z",
    "status": "FAILED",
    "duration": 0,
    "size": 0
  }'

# Wait 2 seconds

# Create successful backup (should resolve alert)
curl -X POST http://localhost:5000/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-003",
    "date": "2026-05-03T14:32:00Z",
    "status": "OK",
    "duration": 285,
    "size": 1450
  }'
```

### Expected Backend Output:

**First Call (Alert Created):**
```
[BackupAlert] ✓ Created CRITICAL alert for server-003
[Email] CRITICAL Backup Alert - DEMO MODE
```

**Second Call (Alert Auto-Resolved):**
```
[BackupAlert] Checking backup for server-003: status=OK
[BackupAlert] ✓ Auto-resolved 1 backup alert(s) for server-003 - backup OK
```

### Result:
- ✅ First alert marked as RESOLVED in database
- ✅ No email sent for successful backup
- ✅ Ready for new alerts if backup fails again

---

## ✅ Test 5: Update Existing Backup

### Action: Change backup status from FAILED to OK
```bash
# First, get the backup ID
curl http://localhost:5000/api/backups/server/server-001?limit=1

# Copy the _id from response, then update it:
curl -X PUT http://localhost:5000/api/backups/[BACKUP_ID] \
  -H "Content-Type: application/json" \
  -d '{
    "status": "OK",
    "duration": 300,
    "size": 2000
  }'
```

### Expected Backend Output:
```
[Backups API] PUT /api/backups/[id] - Updated backup: [id]
[BackupAlert] Checking backup for server-001: status=OK
[BackupAlert] ✓ Auto-resolved 1 backup alert(s) for server-001 - backup OK
```

---

## 📊 Verify Database State

### Check all alerts
```bash
mongo devops_db
db.alerts.find().pretty()
```

### Check ACTIVE alerts only
```bash
db.alerts.find({ status: "ACTIVE" }).pretty()
```

### Check RESOLVED alerts
```bash
db.alerts.find({ status: "RESOLVED" }).pretty()
```

### Check alerts for specific server
```bash
db.alerts.find({ serverId: "server-001" }).pretty()
```

### Count alerts by status
```bash
db.alerts.countDocuments({ status: "ACTIVE" })
db.alerts.countDocuments({ status: "RESOLVED" })
```

---

## 🔍 Monitor Real-Time Updates

### Using React UI (if frontend running):
1. Open http://localhost:3000/backups
2. Select a server from dropdown
3. Trigger a failed backup (see Test 1)
4. Watch UI update in real-time:
   - Red badge appears
   - Health score updates
   - History table refreshes
   - Status indicator pulses

### Using REST API:
```bash
# Get latest backup status
curl http://localhost:5000/api/backups/server/server-001/latest

# Get backup indicators (health score)
curl http://localhost:5000/api/backups/server/server-001/indicators

# Get all alerts for server
curl http://localhost:5000/api/alerts?serverId=server-001
```

---

## 📧 Enable Real Email Notifications

### Step 1: Get Gmail App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer"
3. Copy the 16-character password

### Step 2: Configure Environment
```bash
# Create backend/.env file
echo "EMAIL_USER=your-email@gmail.com" > backend/.env
echo "EMAIL_PASS=xxxx-xxxx-xxxx-xxxx" >> backend/.env
```

### Step 3: Restart Backend
```bash
cd backend
npm start
```

### Step 4: Test Email
```bash
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"testEmail":"your-email@example.com"}'
```

### Step 5: Trigger Real Alert
```bash
curl -X POST http://localhost:5000/api/backups \
  -H "Content-Type: application/json" \
  -d '{
    "serverId": "server-001",
    "date": "2026-05-03T14:00:00Z",
    "status": "FAILED",
    "duration": 0,
    "size": 0
  }'
```

**You should receive an email with:**
- ✅ Subject line with [CRITICAL] and server name
- ✅ Red header with problem description
- ✅ Detailed alert information (server, status, time)
- ✅ Dangers to data
- ✅ Recommended actions
- ✅ Debugging commands
- ✅ Dashboard link

---

## 🐛 Troubleshooting

### No Alerts Being Created
```bash
# Check service is running
ps aux | grep npm

# Check logs
tail -f backend/agent.log.1

# Verify database connection
mongo devops_db
db.alerts.count()
```

### Emails Not Sending
```bash
# Check .env file exists
cat backend/.env

# Verify Gmail app password
# Go to: https://myaccount.google.com/apppasswords

# Check Gmail security settings
# Go to: https://myaccount.google.com/security

# Test email endpoint
curl -X POST http://localhost:5000/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"testEmail":"test@example.com"}'
```

### Duplicate Alerts Still Happening
```bash
# Check database for RESOLVED alerts
mongo devops_db
db.alerts.find({ status: "RESOLVED" }).count()

# Should see old alert marked as RESOLVED, not creating duplicates
```

---

## 📝 Summary

### What Was Built
✅ BackupAlertService - Alert creation and management  
✅ Email notifications - Rich HTML templates  
✅ Duplicate prevention - Check for ACTIVE alerts  
✅ Auto-resolution - Resolve when backup succeeds  
✅ Real-time updates - Socket.io events  
✅ Database storage - Alert history and state  

### Alert Types
| Status | Type | Severity | Action |
|--------|------|----------|--------|
| FAILED | BACKUP_FAILED | CRITICAL | Send email |
| LATE | BACKUP_LATE | WARNING | Log only |
| OK | - | - | Resolve alerts |

### Testing Complete When:
1. ✅ Failed backup creates CRITICAL alert
2. ✅ Late backup creates WARNING alert  
3. ✅ Duplicate alert prevented
4. ✅ Auto-resolution working
5. ✅ Emails sent (if configured)
6. ✅ Real-time UI updates
7. ✅ Database records created

---

## 🎯 Next Steps

1. **Email Production Setup:**
   - Configure EMAIL_USER and EMAIL_PASS in .env
   - Test email endpoint
   - Verify emails received

2. **Alert Dashboard (Optional):**
   - Create React component for alert history
   - Show ACTIVE vs RESOLVED alerts
   - Add acknowledge button

3. **Slack Integration (Optional):**
   - Add Slack webhook support
   - Send alerts to Slack channel
   - Link to dashboard

4. **Monitor and Iterate:**
   - Set up production monitoring
   - Adjust email frequency if needed
   - Gather feedback from ops team
