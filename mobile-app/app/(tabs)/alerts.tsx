import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/apiService';

const METRIC_LABELS: Record<string, string> = {
  cpu_percent: 'CPU',
  ram_percent: 'RAM',
  disk_percent: 'Disque',
};

export default function AlertsScreen() {
  const { email } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [serverNames, setServerNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      const [alertsData, serversData] = await Promise.all([
        apiService.getAlerts({ status: 'ACTIVE' }),
        apiService.getServers(),
      ]);
      setAlerts(alertsData || []);
      const names: Record<string, string> = {};
      (serversData || []).forEach((s: any) => {
        names[s.server_id] = s.name;
      });
      setServerNames(names);
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de charger les alertes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledgingId(alertId);
    try {
      await apiService.acknowledgeAlert(alertId, email || 'mobile');
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
    } catch (error: any) {
      Alert.alert('Erreur', error.message || "Impossible d'acquitter l'alerte");
    } finally {
      setAcknowledgingId(null);
    }
  };

  const renderAlert = ({ item }: { item: any }) => {
    const metricLabel = METRIC_LABELS[item.metric] || item.metric || 'Métrique';
    return (
      <Card style={styles.alertCard}>
        <View style={styles.alertHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertServer}>{serverNames[item.serverId] || item.serverId}</Text>
            <Text style={styles.alertType}>{metricLabel}</Text>
          </View>
          <StatusBadge status={item.severity} />
        </View>
        <Text style={styles.alertMessage}>{item.message}</Text>
        <View style={styles.alertFooter}>
          <Text style={styles.alertTime}>
            {item.timestamp ? new Date(item.timestamp).toLocaleString('fr-FR') : ''}
          </Text>
          <TouchableOpacity
            style={styles.ackButton}
            onPress={() => handleAcknowledge(item._id)}
            disabled={acknowledgingId === item._id}
          >
            <Text style={styles.ackButtonText}>
              {acknowledgingId === item._id ? 'Acquittement...' : 'Acquitter'}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Alertes</Text>
        <Text style={styles.subtitle}>{alerts.length} alerte(s) active(s)</Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item._id}
        renderItem={renderAlert}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucune alerte active</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  alertCard: {
    marginBottom: Theme.spacing.sm,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.xs,
  },
  alertServer: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  alertType: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  alertMessage: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTime: {
    fontSize: 11,
    color: Theme.colors.textMuted,
  },
  ackButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  ackButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: Theme.colors.accent,
  },
  emptyContainer: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
  },
});
