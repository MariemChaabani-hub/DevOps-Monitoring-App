import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AlertModal, { AlertButton } from '@/components/AlertModal';
import Card from '@/components/Card';
import MetricBar from '@/components/MetricBar';
import MetricCard from '@/components/MetricCard';
import SearchBar from '@/components/SearchBar';
import StatusBadge from '@/components/StatusBadge';
import { Theme } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/services/apiService';
import { formatRelativeTime } from '@/utils/formatRelativeTime';

// Background polling cadence for this screen only — not the shared
// APP_CONFIG.REFRESH_INTERVAL, which also drives server-details and would
// change that screen's behavior too if reused here.
const POLL_INTERVAL_MS = 15000;

export default function DashboardScreen() {
  const router = useRouter();
  const { email, logout } = useAuth();
  const [servers, setServers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [alertConfig, setAlertConfig] = useState<{ title: string; message?: string; buttons: AlertButton[] } | null>(null);
  const isFetchingRef = useRef(false);
  // Guards every setState below against firing after this screen has
  // unmounted — fetchData can still be in flight when that happens (screen
  // navigated away from mid-request, or the interval firing right as the
  // component unmounts).
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Alert.alert() replacement (see AlertModal.tsx / remote-actions.tsx) —
  // react-native-web doesn't render Alert.alert at all.
  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
    setAlertConfig({ title, message, buttons });
  };

  const filteredServers = servers.filter((s) =>
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const fetchData = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [serversData, summaryData] = await Promise.all([
        apiService.getServers(),
        apiService.getDashboardSummary(),
      ]);
      // A background poll or pull-to-refresh can resolve after the screen
      // unmounted — applying it anyway would warn ("state update on an
      // unmounted component") and serves no one.
      if (!isMountedRef.current) return;
      setServers(serversData || []);
      setSummary(summaryData);
    } catch (error) {
      // Network hiccup on a background refresh — keep whatever was last
      // successfully loaded rather than clearing the screen.
      console.warn('[Dashboard] fetch error', error);
    } finally {
      isFetchingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleLogout = () => {
    showAlert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  };

  const renderServer = ({ item }: { item: any }) => {
    const metrics = item.current_metrics || {};
    return (
      <TouchableOpacity onPress={() => router.push(`/server-details/${item.server_id}`)}>
        <Card style={styles.serverCard}>
          <View style={styles.serverHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.serverName}>{item.name}</Text>
              <Text style={styles.serverMeta}>{item.location || 'Emplacement inconnu'}</Text>
            </View>
            <StatusBadge status={item.last_metric?.status || item.status} />
          </View>

          <MetricBar label="CPU" value={metrics.cpu_percent ?? 0} type="cpu" />
          <MetricBar label="Mémoire" value={metrics.ram_percent ?? 0} type="ram" />
          <MetricBar label="Disque" value={metrics.disk_percent ?? 0} type="disk" />

          <Text style={styles.updatedAt}>
            Mis à jour {formatRelativeTime(item.last_metric?.timestamp || item.last_metric_time)}
          </Text>
        </Card>
      </TouchableOpacity>
    );
  };

  // Full-screen spinner only on the very first load — loading only ever
  // goes true→false once (fetchData's finally never sets it back to true),
  // so background polls and pull-to-refresh never hit this branch again,
  // avoiding the flicker/scroll-reset a full remount would cause.
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.accent} />
      </View>
    );
  }

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

      <SearchBar value={search} onChangeText={setSearch} placeholder="Rechercher un serveur..." style={styles.searchBar} />

      <FlatList
        data={filteredServers}
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
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun serveur disponible</Text>
          </View>
        }
      />
      <AlertModal
        visible={!!alertConfig}
        title={alertConfig?.title || ''}
        message={alertConfig?.message}
        buttons={alertConfig?.buttons || []}
        onRequestClose={() => setAlertConfig(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
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
  searchBar: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
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
  updatedAt: {
    fontSize: 11,
    color: Theme.colors.textMuted,
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: Theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: Theme.colors.textMuted,
  },
});
