# Backup Status Visual Indicators - Quick Reference

## Color Scheme & Indicators

### Status: OK ✓
- **Color**: Green (#4caf50)
- **Badge**: Green background with checkmark icon
- **Indicator**: Large circle with green gradient, checkmark icon
- **Animation**: None (steady state)
- **Message**: "Latest backup successful"

```
Component: <BackupStatusBadge status="OK" />
Component: <BackupStatusIndicator status="OK" />
```

---

### Status: FAILED ✕
- **Color**: Red (#f44336)
- **Badge**: Red background with X icon
- **Indicator**: Large circle with red gradient, X icon
- **Animation**: Pulsing (2s interval) - draws attention
- **Message**: "Latest backup failed"

```
Component: <BackupStatusBadge status="FAILED" />
Component: <BackupStatusIndicator status="FAILED" />
```

---

### Status: LATE !
- **Color**: Orange (#ff9800)
- **Badge**: Orange background with exclamation icon
- **Indicator**: Large circle with orange gradient, exclamation icon
- **Animation**: Pulsing (1s interval) - rapid alert
- **Message**: "Backup is missing or late"

```
Component: <BackupStatusBadge status="LATE" />
Component: <BackupStatusIndicator status="LATE" />
```

---

## Component Usage Examples

### BackupStatusBadge - Inline Display
```javascript
// Default (medium size)
<BackupStatusBadge status="OK" size="medium" showIcon={true} />

// Small (for tables/lists)
<BackupStatusBadge status="FAILED" size="small" showIcon={true} />

// Large (for emphasis)
<BackupStatusBadge status="LATE" size="large" showIcon={true} />

// Without icon
<BackupStatusBadge status="OK" size="medium" showIcon={false} />
```

### BackupStatusIndicator - Prominent Display
```javascript
// With animations
<BackupStatusIndicator status="OK" animated={true} />

// Without animations
<BackupStatusIndicator status="FAILED" animated={false} />

// Auto-animated based on status
<BackupStatusIndicator status="LATE" />
```

---

## Visual Layout in BackupMonitoring Component

```
┌─────────────────────────────────────────────────┐
│ Backup Monitoring - server-001        Connected │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │         🟢 OK Status Indicator          │   │
│  │    Backup OK - Latest backup successful │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐  ┌──────────────┐         │
│  │ Latest Backup   │  │   Health     │         │
│  │ ✓ OK [badge]    │  │ Score: 88    │         │
│  │ Date: ...       │  │ OK: 38       │         │
│  │ Duration: 245s  │  │ Failed: 3    │         │
│  │ Size: 1250 MB   │  │ Late: 1      │         │
│  └─────────────────┘  └──────────────┘         │
│                                                 │
├─────────────────────────────────────────────────┤
│ Backup History                                  │
├─────────────────────────────────────────────────┤
│ Date          │ Status  │ Duration   │ Size    │
├───────────────┼─────────┼────────────┼─────────┤
│ 2026-05-03    │ ✓ OK    │ 245s       │ 1250 MB │
│ 2026-05-02    │ ✕ FAIL  │ 0s         │ 0 MB    │
│ 2026-05-01    │ ! LATE  │ 300s       │ 1500 MB │
└─────────────────────────────────────────────────┘
```

---

## Color Values for Reference

| Status | Hex Code | RGB | Name |
|--------|----------|-----|------|
| OK (Primary) | #4caf50 | 76, 175, 80 | Light Green |
| OK (Dark) | #388e3c | 56, 142, 60 | Dark Green |
| FAILED (Primary) | #f44336 | 244, 67, 54 | Red |
| FAILED (Dark) | #d32f2f | 211, 47, 47 | Dark Red |
| LATE (Primary) | #ff9800 | 255, 152, 0 | Orange |
| LATE (Dark) | #f57c00 | 245, 124, 0 | Dark Orange |

---

## Responsive Behavior

- **Desktop**: 3-column card layout, large badges
- **Tablet**: 2-column card layout, medium badges
- **Mobile**: 1-column stack, small badges

Table scrolls horizontally on screens under 768px.

---

## Animation Details

### FAILED Status (Red)
- Animation: Pulse (2 second interval)
- Effect: Opacity changes 100% → 80% → 100%
- Purpose: High visibility, slow steady pulse

### LATE Status (Orange)
- Animation: Pulse (1 second interval)
- Effect: Opacity changes 100% → 70% → 100%
- Purpose: Very high visibility, faster urgent pulse

### OK Status (Green)
- Animation: None
- Effect: Steady, calm presentation
- Purpose: No action needed

---

## Accessibility

- All badges have sufficient color contrast (WCAG AA)
- Icons provide additional context beyond color
- Status text is always visible (not just color)
- Animations respect `prefers-reduced-motion` media query
