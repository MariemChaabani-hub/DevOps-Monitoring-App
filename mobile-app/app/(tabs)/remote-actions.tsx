import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AlertModal, { AlertButton } from '@/components/AlertModal';
import Card from '@/components/Card';
import StatusBadge from '@/components/StatusBadge';
import { Theme, getSubStateColor, getSubStateLabel } from '@/constants/theme';
import { apiService } from '@/services/apiService';

type DetectedService = {
  name: string;
  active_state?: string;
  sub_state?: string;
  description?: string;
  is_system?: boolean;
};

// Same page size as the web panel (RemoteActionsPanel.js's SERVICES_PAGE_SIZE).
const SERVICES_PAGE_SIZE = 6;

// failed ranks first so it floats to the top of the merged list, same
// effect as the web's separate "En échec" zone without a second section.
const SUB_STATE_SORT_RANK: Record<string, number> = { failed: -1, running: 0, exited: 1, dead: 2, unknown: 3 };

const QUICK_FILTERS: { key: 'all' | 'active' | 'stopped' | 'failed'; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'active', label: 'Actifs' },
  { key: 'stopped', label: 'Arrêtés' },
  { key: 'failed', label: 'En échec' },
];

export default function RemoteActionsScreen() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [servicesStatus, setServicesStatus] = useState<Record<string, any>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [serverActionBusy, setServerActionBusy] = useState<'restart' | 'shutdown' | null>(null);
  const [quickFilter, setQuickFilter] = useState<'all' | 'active' | 'stopped' | 'failed'>('all');
  const [visibleCount, setVisibleCount] = useState(SERVICES_PAGE_SIZE);
  const [alertConfig, setAlertConfig] = useState<{ title: string; message?: string; buttons: AlertButton[] } | null>(null);
  const burstTimeouts = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Alert.alert() replacement (see AlertModal.tsx) — react-native-web
  // doesn't render Alert.alert at all. Defaults to a single dismiss button
  // when none is given, matching Alert.alert(title, message)'s behavior.
  const showAlert = (title: string, message?: string, buttons: AlertButton[] = [{ text: 'OK' }]) => {
    setAlertConfig({ title, message, buttons });
  };

  const selectedServer = servers.find((s) => s.server_id === selectedServerId);
  // Same reliable source as the dashboard fix — server.status alone can be
  // stuck stale, last_metric.status is written fresh on every /metrics POST.
  const selectedServerStatus = selectedServer
    ? selectedServer.last_metric?.status || selectedServer.status
    : null;
  const isServerOffline = selectedServerStatus === 'OFFLINE';

  const detectedServices: DetectedService[] = (selectedServer?.services || []).map((s: any) =>
    typeof s === 'string' ? { name: s, active_state: 'unknown', sub_state: 'unknown', description: '' } : s
  );

  const getEffectiveSubState = (service: DetectedService) => {
    const live = servicesStatus[service.name];
    return live?.subState || service.sub_state || 'unknown';
  };

  const bySubStateRank = (a: DetectedService, b: DetectedService) => {
    const rankDiff = (SUB_STATE_SORT_RANK[getEffectiveSubState(a)] ?? 3) - (SUB_STATE_SORT_RANK[getEffectiveSubState(b)] ?? 3);
    return rankDiff !== 0 ? rankDiff : a.name.localeCompare(b.name);
  };

  // Local-only filter over already-loaded data — no new API call, same as
  // the web panel's matchesQuickFilter.
  const matchesQuickFilter = (service: DetectedService) => {
    if (quickFilter === 'all') return true;
    const subState = getEffectiveSubState(service);
    if (quickFilter === 'active') return subState === 'running';
    if (quickFilter === 'stopped') return subState === 'dead' || subState === 'exited';
    if (quickFilter === 'failed') return subState === 'failed';
    return true;
  };

  const filteredServices = detectedServices.filter(matchesQuickFilter).sort(bySubStateRank);

  const fetchServers = useCallback(() => {
    apiService
      .getServers()
      .then((data) => setServers(data || []))
      .catch((error: any) => showAlert('Erreur', error.message || 'Impossible de charger les serveurs'));
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const fetchStatus = useCallback(async (serverId: string) => {
    try {
      const data = await apiService.getServicesStatus(serverId);
      setServicesStatus(data.services || {});
    } catch (error: any) {
      console.warn('[RemoteActions] status fetch error', error);
    }
  }, []);

  useEffect(() => {
    setServicesStatus({});
    setQuickFilter('all');
    setVisibleCount(SERVICES_PAGE_SIZE);
    // Skip the SSH-backed status check entirely for a server already known
    // OFFLINE — it would just hang until each per-service SSH connection
    // times out, for a result (nothing reachable) that's already known.
    if (selectedServerId && !isServerOffline) fetchStatus(selectedServerId);
    return () => {
      burstTimeouts.current.forEach(clearTimeout);
      burstTimeouts.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServerId, fetchStatus]);

  // Changing the filter should restart pagination — otherwise a filtered
  // list shorter than the current page would just show everything anyway,
  // and switching back to "Tous" could land mid-list instead of at the top.
  useEffect(() => {
    setVisibleCount(SERVICES_PAGE_SIZE);
  }, [quickFilter]);

  // After an action, a service takes a few seconds to actually change
  // state — a short burst of re-checks (like the web panel) is more useful
  // here than a permanent background poll.
  const scheduleStatusBurst = (serverId: string) => {
    burstTimeouts.current.forEach(clearTimeout);
    burstTimeouts.current = [3000, 6000, 9000, 12000, 15000].map((delay) =>
      setTimeout(() => fetchStatus(serverId), delay)
    );
  };

  const runServiceAction = async (action: 'start' | 'restart' | 'stop', serviceName: string, confirm = false) => {
    if (!selectedServerId) return;
    const key = `${serviceName}_${action}`;
    setBusyKey(key);
    try {
      const result =
        action === 'start'
          ? await apiService.startService(selectedServerId, serviceName)
          : action === 'restart'
          ? await apiService.restartService(selectedServerId, serviceName, confirm)
          : await apiService.stopService(selectedServerId, serviceName);
      showAlert('Succès', result.message);
      fetchStatus(selectedServerId);
      scheduleStatusBurst(selectedServerId);
    } catch (error: any) {
      showAlert('Erreur', error.message || `Échec de l'action sur ${serviceName}`);
    } finally {
      setBusyKey(null);
    }
  };

  // Entry point for every service action button. A restart on a
  // 'restart_only' service (ssh, network stack...) needs an explicit
  // confirmation first — actual enforcement happens server-side
  // (remoteActions.js requires confirm:true in the body), this is just the
  // UI step that produces it. Same rule as the web panel.
  const handleServiceAction = (action: 'start' | 'restart' | 'stop', service: DetectedService) => {
    const criticality = servicesStatus[service.name]?.criticality || 'none';
    if (criticality === 'restart_only' && action === 'restart') {
      showAlert(
        'Confirmation requise',
        `Redémarrer ${service.name} sur ${selectedServer?.name || selectedServerId} ? Cette action peut interrompre l'accès au serveur.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Confirmer', style: 'destructive', onPress: () => runServiceAction('restart', service.name, true) },
        ]
      );
      return;
    }
    runServiceAction(action, service.name);
  };

  const handleRestartServer = () => {
    if (!selectedServer) return;
    showAlert(
      'Redémarrer le serveur',
      `${selectedServer.name} va redémarrer (interruption de quelques minutes). Continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          style: 'destructive',
          onPress: async () => {
            setServerActionBusy('restart');
            try {
              const result = await apiService.restartServer(selectedServer.server_id, 30);
              showAlert('Succès', result.message);
              fetchServers();
            } catch (error: any) {
              showAlert('Erreur', error.message || 'Impossible de redémarrer le serveur');
            } finally {
              setServerActionBusy(null);
            }
          },
        },
      ]
    );
  };

  const handleShutdownServer = () => {
    if (!selectedServer) return;
    showAlert(
      'Arrêter le serveur',
      `Le serveur ${selectedServer.name} va s'éteindre complètement. Vous devrez le redémarrer manuellement (ex. depuis VirtualBox pour une VM). Continuer ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Arrêter',
          style: 'destructive',
          onPress: async () => {
            setServerActionBusy('shutdown');
            try {
              const result = await apiService.shutdownServer(selectedServer.server_id, 60, 'Maintenance planifiée');
              showAlert('Succès', result.message);
              fetchServers();
            } catch (error: any) {
              showAlert('Erreur', error.message || "Impossible d'arrêter le serveur");
            } finally {
              setServerActionBusy(null);
            }
          },
        },
      ]
    );
  };

  const renderServiceCard = (service: DetectedService) => {
    const live = servicesStatus[service.name];
    const statusKnown = !!live;
    const subState = getEffectiveSubState(service);
    const subStateLabel = live?.subStateLabel || getSubStateLabel(subState);
    const subStateColor = getSubStateColor(subState);

    // Criticality is only known once /services-status has answered for
    // this exact service — until then, show no action buttons at all
    // rather than defaulting to "allowed" (could flash an enabled Arrêter
    // on a locked service like k3s/monitoring-agent) or disabled-but-
    // visible (invites a tap the backend then rejects). Same rule as web.
    const criticality = live?.criticality || 'none';
    const canStart = statusKnown && criticality !== 'locked' && subState !== 'running';
    const canRestart = statusKnown && criticality !== 'locked';
    const canStop = statusKnown && criticality === 'none';

    const startKey = `${service.name}_start`;
    const restartKey = `${service.name}_restart`;
    const stopKey = `${service.name}_stop`;

    return (
      <Card key={service.name} style={styles.serviceCard}>
        <View style={styles.serviceHeader}>
          <Text style={styles.serviceName}>{service.name}</Text>
          <StatusBadge label={subStateLabel} color={subStateColor} />
        </View>
        {!!service.description && <Text style={styles.serviceDescription}>{service.description}</Text>}
        <View style={styles.serviceActionsRow}>
          {!statusKnown && <Text style={styles.serviceHint}>Chargement...</Text>}
          {statusKnown && !canStart && !canRestart && !canStop && (
            <Text style={styles.serviceHint}>Service protégé</Text>
          )}
          {canStart && (
            <TouchableOpacity
              style={[styles.miniButton, styles.startButton, busyKey === startKey && styles.disabledButton]}
              onPress={() => handleServiceAction('start', service)}
              disabled={busyKey === startKey}
            >
              <Text style={styles.miniButtonText}>{busyKey === startKey ? '...' : 'Démarrer'}</Text>
            </TouchableOpacity>
          )}
          {canRestart && (
            <TouchableOpacity
              style={[styles.miniButton, styles.restartButton, busyKey === restartKey && styles.disabledButton]}
              onPress={() => handleServiceAction('restart', service)}
              disabled={busyKey === restartKey}
            >
              <Text style={styles.miniButtonText}>{busyKey === restartKey ? '...' : 'Redémarrer'}</Text>
            </TouchableOpacity>
          )}
          {canStop && (
            <TouchableOpacity
              style={[styles.miniButton, styles.stopButton, busyKey === stopKey && styles.disabledButton]}
              onPress={() => handleServiceAction('stop', service)}
              disabled={busyKey === stopKey}
            >
              <Text style={styles.miniButtonText}>{busyKey === stopKey ? '...' : 'Arrêter'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const renderServiceSection = () => {
    const visible = filteredServices.slice(0, visibleCount);
    const remaining = filteredServices.length - visible.length;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services ({filteredServices.length})</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {QUICK_FILTERS.map((f) => {
            const active = quickFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setQuickFilter(f.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filteredServices.length === 0 ? (
          <Text style={styles.emptyText}>Aucun service ne correspond à ce filtre.</Text>
        ) : (
          <>
            {visible.map(renderServiceCard)}
            {remaining > 0 && (
              <TouchableOpacity style={styles.showMoreButton} onPress={() => setVisibleCount(visibleCount + SERVICES_PAGE_SIZE)}>
                <Text style={styles.showMoreText}>Voir les {remaining} autres services</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    );
  };

  // ---- Level 1: server list ----
  if (!selectedServerId) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Actions à distance</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          {servers.length === 0 && <Text style={styles.emptyText}>Aucun serveur disponible</Text>}
          {servers.map((server) => (
            <TouchableOpacity key={server.server_id} onPress={() => setSelectedServerId(server.server_id)}>
              <Card style={styles.serverCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.serverName}>{server.name}</Text>
                  <Text style={styles.serverMeta}>{server.location || 'Emplacement inconnu'}</Text>
                </View>
                <StatusBadge status={server.last_metric?.status || server.status} />
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

  // ---- Level 2: actions for the selected server ----
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setSelectedServerId(null)}>
          <Text style={styles.backLink}>‹ Retour aux serveurs</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{selectedServer?.name || selectedServerId}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isServerOffline && (
          <Text style={styles.offlineWarning}>
            Serveur hors ligne — SSH nécessite que la machine soit déjà démarrée. Redémarrez-la manuellement pour retrouver les actions à distance.
          </Text>
        )}

        {!!serverActionBusy && (
          <View style={styles.busyBanner}>
            <ActivityIndicator size="small" color={Theme.colors.accent} />
            <Text style={styles.busyBannerText}>
              {serverActionBusy === 'restart' ? 'Redémarrage' : 'Arrêt'} en cours — la commande SSH doit
              se terminer avant confirmation, ça peut prendre jusqu'à 90 secondes. Merci de patienter.
            </Text>
          </View>
        )}

        <View style={styles.serverActionsRow}>
          <TouchableOpacity
            style={[styles.serverActionButton, styles.restartServerButton, (isServerOffline || serverActionBusy) && styles.disabledButton]}
            onPress={handleRestartServer}
            disabled={isServerOffline || !!serverActionBusy}
          >
            {serverActionBusy === 'restart' && <ActivityIndicator size="small" color={Theme.colors.textPrimary} style={styles.buttonSpinner} />}
            <Text style={styles.serverActionButtonText}>
              {serverActionBusy === 'restart' ? 'Redémarrage...' : 'Redémarrer le serveur'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.serverActionButton, styles.shutdownServerButton, (isServerOffline || serverActionBusy) && styles.disabledButton]}
            onPress={handleShutdownServer}
            disabled={isServerOffline || !!serverActionBusy}
          >
            {serverActionBusy === 'shutdown' && <ActivityIndicator size="small" color={Theme.colors.textPrimary} style={styles.buttonSpinner} />}
            <Text style={styles.serverActionButtonText}>
              {serverActionBusy === 'shutdown' ? 'Arrêt...' : 'Arrêter le serveur'}
            </Text>
          </TouchableOpacity>
        </View>

        {detectedServices.length === 0 ? (
          <Text style={styles.emptyText}>Aucun service détecté pour ce serveur pour le moment.</Text>
        ) : (
          renderServiceSection()
        )}
      </ScrollView>
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
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.sm,
  },
  backLink: {
    color: Theme.colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Theme.spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl,
  },
  emptyText: {
    color: Theme.colors.textMuted,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
  },
  serverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  offlineWarning: {
    fontSize: 13,
    color: Theme.status.WARNING,
    marginBottom: Theme.spacing.md,
  },
  busyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  busyBannerText: {
    flex: 1,
    fontSize: 12,
    color: Theme.colors.textSecondary,
    lineHeight: 17,
  },
  serverActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  serverActionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSpinner: {
    marginRight: Theme.spacing.sm,
  },
  restartServerButton: {
    backgroundColor: Theme.colors.accent,
  },
  shutdownServerButton: {
    backgroundColor: Theme.colors.danger,
  },
  disabledButton: {
    opacity: 0.5,
  },
  serverActionButtonText: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.sm,
  },
  filterRow: {
    flexGrow: 0,
    marginBottom: Theme.spacing.md,
  },
  filterContent: {
    gap: Theme.spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.surface,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: Theme.colors.accent,
    borderColor: Theme.colors.accent,
  },
  filterChipText: {
    color: Theme.colors.textSecondary,
    fontWeight: '600',
    fontSize: 12,
  },
  filterChipTextActive: {
    color: Theme.colors.textPrimary,
  },
  serviceCard: {
    marginBottom: Theme.spacing.sm,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  serviceDescription: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    marginTop: Theme.spacing.sm,
  },
  serviceHint: {
    fontSize: 12,
    color: Theme.colors.textMuted,
    fontStyle: 'italic',
    marginTop: Theme.spacing.sm,
  },
  serviceActionsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
    marginTop: Theme.spacing.sm,
  },
  miniButton: {
    width: 84,
    paddingVertical: 5,
    borderRadius: Theme.radius.sm,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: Theme.status.OK,
  },
  restartButton: {
    backgroundColor: Theme.colors.accent,
  },
  stopButton: {
    backgroundColor: Theme.colors.danger,
  },
  miniButtonText: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  showMoreText: {
    color: Theme.colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
});
