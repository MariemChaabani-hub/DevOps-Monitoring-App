import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Theme, getStatusColor, getStatusLabel } from '../constants/theme';

/**
 * Small colored status pill. Used by Dashboard (server status), Server
 * Detail (header status) and Alerts (severity). `status` is one of
 * OK/WARNING/CRITICAL/OFFLINE for server status, or a raw severity string
 * (WARNING/CRITICAL) for alerts — both resolve through the same
 * Theme.status color map.
 */
const StatusBadge = ({ status, label = null }) => {
  const color = getStatusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: `${color}26`, borderColor: `${color}66` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label || getStatusLabel(status)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Theme.radius.pill,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});

export default StatusBadge;
