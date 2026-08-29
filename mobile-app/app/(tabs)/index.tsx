import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import Card from '@/components/Card';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import { APP_CONFIG } from '@/config/constants';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/apiService';

export default function DashboardScreen() {
  const router = useRouter();
  const { email, logout } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [serversData, summaryData] = await Promise.all([
        apiService.getServers(),
        apiService.getDashboardSummary(),
      ]);
      setServers(serversData || []);
      setSummary(summaryData);
    } catch (error) {
      console.warn('[Dashboard] fetch error', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, APP_CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  const renderServer = ({ item }: { item: any }) => (
    <TouchableOpacity onPress={() => router.push(`/server-details/${item.server_id}`)}>
      <Card style={styles.serverCard}>
        <View style={styles.serverHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.serverName}>{item.name}</Text>
            <Text style={styles.serverMeta}>{item.location || 'Emplacement inconnu'}</Text>
          </View>
          <StatusBadge status={item.status} />
        </View>
        <View style={styles.metricsRow}>
          <Text style={styles.metricText}>
            CPU {item.current_metrics?.cpu_percent?.toFixed(0) ?? '–'}%
          </Text>
          <Text style={styles.metricText}>
            RAM {item.current_metrics?.ram_percent?.toFixed(0) ?? '–'}%
          </Text>
          <Text style={styles.metricText}>
            Disque {item.current_metrics?.disk_percent?.toFixed(0) ?? '–'}%
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Tableau de bord</Text>
          {!!email && <Text style={styles.headerEmail}>{email}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={servers}
        keyExtractor={(item) => item.server_id || item._id}
        renderItem={renderServer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          summary ? (
            <View style={styles.summaryRow}>
              <MetricCard
                title="Santé"
                value={`${summary.health?.health_percentage ?? 0}%`}
                color={Theme.status.OK}
                small
              />
              <MetricCard
                title="Alertes actives"
                value={String(summary.alerts?.total ?? 0)}
                color={Theme.status.CRITICAL}
                small
              />
              <MetricCard
                title="Serveurs"
                value={String(servers.length)}
                color={Theme.colors.accent}
                small
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun serveur disponible</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  headerEmail: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Theme.radius.pill,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  logoutText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  serverCard: {
    marginBottom: Theme.spacing.sm,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.sm,
  },
  serverName: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  serverMeta: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  metricText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
  },
});
