import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Theme } from '../constants/theme';

const MetricCard = ({ title, value, color = Theme.colors.accent, small = false }) => {
  return (
    <View style={[styles.container, small && styles.smallContainer]}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <Text style={[styles.title, small && styles.smallTitle]}>{title}</Text>
      <Text style={[styles.value, small && styles.smallValue]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  smallContainer: {
    padding: Theme.spacing.sm,
  },
  bar: {
    width: 32,
    height: 4,
    borderRadius: 2,
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  smallTitle: {
    fontSize: 10,
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
  },
  smallValue: {
    fontSize: 14,
  },
});

export default MetricCard;
