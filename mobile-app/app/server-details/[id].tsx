import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

import Card from '@/components/Card';
import MetricCard from '@/components/MetricCard';
import StatusBadge from '@/components/StatusBadge';
import { APP_CONFIG } from '@/config/constants';
import { Theme } from '@/constants/theme';
import { apiService } from '@/services/apiService';

const { width: screenWidth } = Dimensions.get('window');

export default function ServerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [server, setServer] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!id || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const [serverData, metricsData] = await Promise.all([
        apiService.getServer(id as string),
        apiService.getServerMetrics(id as string, { minutes: 60, limit: 60 }),
      ]);
      setServer(serverData);
      setHistory(metricsData || []);
    } catch (error) {
      console.warn('[ServerDetails] fetch error', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, APP_CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!server) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Serveur non trouvé</Text>
      </View>
    );
  }

  // The backend (GET /api/servers/:id/metrics) sorts by timestamp DESC
  // (newest first), so the 12 most recent points are the first 12, not the
  // last 12 — slice(-12) on a descending array grabs the OLDEST points once
  // there are more than 12 in the window. Take the first 12, then reverse
  // to chronological order for the chart.
  const points = [...history].slice(0, 12).reverse();
  // A local dev machine (vm-virtualbox, default-server) only reports while
  // powered on, unlike an always-on VPS — the 60-minute window can
  // legitimately contain 0 or 1 point. A single point still renders (as an
  // isolated dot, no line), so only true emptiness falls back to the
  // explicit message below instead of the section silently vanishing.
  const chartData =
    points.length > 0
      ? {
          labels: points.map((_, i) => (i % 3 === 0 ? `${i}` : '')),
          datasets: [
            { data: points.map((m: any) => m.cpu_percent || 0), color: () => Theme.status.CRITICAL, strokeWidth: 2 },
            { data: points.map((m: any) => m.ram_percent || 0), color: () => Theme.colors.accent, strokeWidth: 2 },
          ],
        }
      : null;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Theme.colors.accent} />}
    >
      <Card style={styles.headerCard}>
        <View style={styles.serverHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.serverName}>{server.name}</Text>
            <Text style={styles.serverMeta}>{server.location || 'Emplacement inconnu'}</Text>
          </View>
          {/* server.status is the raw Server-document field, prone to going
              stale (see the OFFLINE/fresh-metric investigation this week) —
              latest_metric.status is written fresh on every /metrics POST
              and never affected by that. Note: this route names the field
              `latest_metric` while GET /api/servers (the dashboard list)
              names the equivalent field `last_metric` — inconsistent naming
              across the two backend routes, known tech debt, not fixed here
              to avoid reopening backend work this close to the defense. */}
          <StatusBadge status={server.latest_metric?.status || server.status} />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard title="CPU" value={`${server.current_metrics?.cpu_percent?.toFixed(1) ?? 0}%`} color={Theme.status.CRITICAL} small />
          <MetricCard title="RAM" value={`${server.current_metrics?.ram_percent?.toFixed(1) ?? 0}%`} color={Theme.colors.accent} small />
          <MetricCard title="Disque" value={`${server.current_metrics?.disk_percent?.toFixed(1) ?? 0}%`} color={Theme.status.WARNING} small />
        </View>
      </Card>

      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Historique récent</Text>
        {!chartData ? (
          // Never hide the section silently — a local dev machine
          // (vm-virtualbox, default-server) can legitimately have zero
          // metrics in the last 60 minutes while powered off, and that
          // must read as "not enough data", not look like a missing feature.
          <Text style={styles.emptyHistoryText}>
            Historique insuffisant pour cette période (aucune métrique reçue dans les 60 dernières minutes)
          </Text>
        ) : (
        <>
          <LineChart
            data={chartData}
            width={screenWidth - Theme.spacing.lg * 2 - Theme.spacing.md * 2}
            height={200}
            chartConfig={{
              backgroundColor: Theme.colors.surface,
              backgroundGradientFrom: Theme.colors.surface,
              backgroundGradientTo: Theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(180, 180, 204, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(180, 180, 204, ${opacity})`,
              style: { borderRadius: Theme.radius.md },
              propsForDots: { r: '3', strokeWidth: '1', stroke: Theme.colors.accent },
              propsForBackgroundLines: { stroke: Theme.colors.border },
            }}
            bezier
            style={styles.chart}
          />
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Theme.status.CRITICAL }]} />
              <Text style={styles.legendText}>CPU</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Theme.colors.accent }]} />
              <Text style={styles.legendText}>RAM</Text>
            </View>
          </View>
        </>
        )}
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Identifiant</Text>
          <Text style={styles.infoValue}>{server.server_id}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Dernière mise à jour</Text>
          <Text style={styles.infoValue}>
            {server.last_metric_time ? new Date(server.last_metric_time).toLocaleString('fr-FR') : '—'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Services détectés</Text>
          <Text style={styles.infoValue}>{server.services?.length || 0}</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  centered: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    fontSize: 16,
  },
  headerCard: {
    margin: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  serverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  serverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  serverMeta: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  chartCard: {
    margin: Theme.spacing.lg,
    marginTop: 0,
    marginBottom: Theme.spacing.sm,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  chart: {
    borderRadius: Theme.radius.md,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: Theme.colors.textMuted,
    paddingVertical: Theme.spacing.md,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Theme.spacing.sm,
    gap: Theme.spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  infoCard: {
    margin: Theme.spacing.lg,
    marginTop: 0,
    marginBottom: Theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: Theme.colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    color: Theme.colors.textPrimary,
    fontWeight: '600',
  },
});
