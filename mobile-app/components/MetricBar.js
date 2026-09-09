import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme } from '../constants/theme';

/**
 * Thresholds mirror frontend/src/components/ServerCard.js's getCpuColor /
 * getRamColor exactly (including that the web reuses getRamColor for disk
 * too, i.e. disk is NOT 70/90 like CPU) — kept intentionally asymmetric so
 * mobile and web show the same color at the same value, rather than a
 * "cleaner" uniform 70/90 that would disagree with the web at 80-90%.
 */
const THRESHOLDS = {
  cpu: { warning: 70, critical: 90 },
  ram: { warning: 70, critical: 85 },
  disk: { warning: 70, critical: 85 },
};

const getBarColor = (type, value) => {
  const { warning, critical } = THRESHOLDS[type] || THRESHOLDS.cpu;
  if (value > critical) return Theme.status.CRITICAL;
  if (value > warning) return Theme.status.WARNING;
  return Theme.status.OK;
};

const MetricBar = ({ label, value, type = 'cpu' }) => {
  const pct = typeof value === 'number' && !Number.isNaN(value) ? value : 0;
  const color = getBarColor(type, pct);

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color }]}>{pct.toFixed(0)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.surfaceElevated,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Theme.radius.pill,
  },
});

export default MetricBar;
