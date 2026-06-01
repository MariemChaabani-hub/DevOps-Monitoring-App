import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MetricCard = ({ title, value, icon, color, small = false }) => {
  return (
    <View style={[styles.container, small && styles.smallContainer]}>
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.title, small && styles.smallTitle]}>{title}</Text>
      <Text style={[styles.value, small && styles.smallValue]}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  smallContainer: {
    padding: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 12,
    color: '#7f8c8d',
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
    color: '#2c3e50',
    textAlign: 'center',
  },
  smallValue: {
    fontSize: 14,
  },
});

export default MetricCard;
