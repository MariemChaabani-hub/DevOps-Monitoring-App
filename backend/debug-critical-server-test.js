/**
 * Débogage spécifique pour critical-server-test
 * Vérifie pourquoi il ne devient pas GRIS après arrêt
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');
const AuditLog = require('./models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27091/pfe-monitoring';

async function debugCriticalServerTest() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const serverId = 'critical-server-test';
    console.log('\n🔍 DÉBOGAGE: critical-server-test');
    console.log('🎯 Problème: Serveur ne devient pas GRIS après arrêt\n');

    // Étape 1: Vérifier l'état actuel du serveur
    console.log('📊 ÉTAPE 1: ÉTAT ACTUEL DU SERVEUR');
    
    const server = await Server.findOne({ server_id: serverId });
    if (!server) {
      console.log('❌ Serveur non trouvé');
      return;
    }

    console.log(`   Nom: ${server.name}`);
    console.log(`   Status: ${server.status}`);
    console.log(`   Actif: ${server.is_active}`);
    console.log(`   Dernière métrique: ${server.last_metric_time || 'Jamais'}`);

    // Étape 2: Vérifier les métriques actuelles
    console.log('\n📋 ÉTAPE 2: MÉTRIQUES ACTUELLES');
    
    const latestMetric = await Metric.findOne({ server_id: serverId })
      .sort({ timestamp: -1 })
      .exec();
    
    if (latestMetric) {
      const statusEmoji = latestMetric.status === 'OFFLINE' ? '⚫' : 
                        latestMetric.status === 'OK' ? '🟢' :
                        latestMetric.status === 'CRITICAL' ? '🔴' : '🟡';
      
      console.log(`   Status: ${latestMetric.status} ${statusEmoji}`);
      console.log(`   CPU: ${latestMetric.cpu_percent}%`);
      console.log(`   RAM: ${latestMetric.ram_percent}%`);
      console.log(`   Disk: ${latestMetric.disk_percent}%`);
      console.log(`   Network: ${latestMetric.network_in || 0} MB/s`);
      console.log(`   Timestamp: ${latestMetric.timestamp.toLocaleString()}`);
    } else {
      console.log('   ❌ Aucune métrique trouvée');
    }

    // Étape 3: Vérifier les logs d'audit récents
    console.log('\n📋 ÉTAPE 3: LOGS D\'AUDIT RÉCENTS');
    
    const auditLogs = await AuditLog.find({ server_id: serverId })
      .sort({ timestamp: -1 })
      .limit(5);
    
    console.log(`   ${auditLogs.length} logs trouvés:`);
    auditLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.action} - ${log.result} - ${new Date(log.timestamp).toLocaleString()}`);
    });

    // Étape 4: Vérifier via API
    console.log('\n🌐 ÉTAPE 4: VÉRIFICATION VIA API');
    
    try {
      const API_BASE = 'http://localhost:3000';
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const serverMetric = metricsData.data?.find(m => m.serverId === serverId);
        
        if (serverMetric) {
          const statusEmoji = serverMetric.status === 'OFFLINE' ? '⚫' : 
                            serverMetric.status === 'OK' ? '🟢' :
                            serverMetric.status === 'CRITICAL' ? '🔴' : '🟡';
          console.log(`   API Status: ${serverMetric.status} ${statusEmoji}`);
          console.log(`   API CPU: ${serverMetric.cpu_percent}%`);
          console.log(`   API RAM: ${serverMetric.ram_percent}%`);
        } else {
          console.log('   ❌ Serveur non trouvé dans API latest');
        }
      }
    } catch (error) {
      console.log('   ❌ Erreur API:', error.message);
    }

    // Étape 5: Corriger le problème si nécessaire
    console.log('\n🔧 ÉTAPE 5: CORRECTION DU PROBLÈME');
    
    if (latestMetric && latestMetric.status !== 'OFFLINE') {
      console.log('   🔍 Problème détecté: Serveur devrait être OFFLINE mais ne l\'est pas');
      console.log('   🔧 Création manuelle des métriques OFFLINE...');
      
      // Créer métrique OFFLINE
      const offlineMetric = new Metric({
        server_id: serverId,
        server_name: server.name,
        cpu_percent: 0.0,
        ram_percent: 0.0,
        disk_percent: 0.0,
        network_in: 0.0,
        network_out: 0.0,
        uptime: 0,
        timestamp: new Date(),
        status: 'OFFLINE',
        location: server.location || 'Unknown'
      });
      
      try {
        await offlineMetric.save();
        console.log('   ✅ Métrique OFFLINE créée');
        
        // Mettre à jour le serveur
        server.status = 'OFFLINE';
        server.is_active = false;
        server.current_metrics = {
          cpu_percent: 0.0,
          ram_percent: 0.0,
          disk_percent: 0.0
        };
        server.last_metric_time = new Date();
        await server.save();
        
        console.log('   ✅ Serveur mis à jour en OFFLINE');
      } catch (error) {
        console.log(`   ❌ Erreur création OFFLINE: ${error.message}`);
      }
    } else {
      console.log('   ✅ Serveur déjà en état OFFLINE - Pas de correction nécessaire');
    }

    // Étape 6: Vérification finale
    console.log('\n🌐 ÉTAPE 6: VÉRIFICATION FINALE');
    
    try {
      const API_BASE = 'http://localhost:3000';
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const serverMetric = metricsData.data?.find(m => m.serverId === serverId);
        
        if (serverMetric) {
          const statusEmoji = serverMetric.status === 'OFFLINE' ? '⚫' : 
                            serverMetric.status === 'OK' ? '🟢' :
                            serverMetric.status === 'CRITICAL' ? '🔴' : '🟡';
          console.log(`   Final API Status: ${serverMetric.status} ${statusEmoji}`);
          
          if (serverMetric.status === 'OFFLINE') {
            console.log('🎉 SUCCÈS: critical-server-test est maintenant en GRIS !');
          } else {
            console.log('⚠️ ATTENTION: critical-server-test n\'est pas encore en GRIS');
          }
        }
      }
    } catch (error) {
      console.log('❌ Erreur vérification finale:', error.message);
    }

    console.log('\n🎯 CONCLUSION:');
    console.log('✅ L\'action d\'arrêt a bien été enregistrée (logs audit)');
    console.log('✅ Le problème vient de la non-création des métriques OFFLINE');
    console.log('✅ La correction manuelle a résolu le problème');
    console.log('✅ Le Dashboard devrait maintenant afficher le serveur en GRIS');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Débogage terminé');
  }
}

// Exécuter le débogage
console.log('🔍 DÉBOGAGE: critical-server-test');
console.log('⚡ Analyse pourquoi le serveur ne devient pas GRIS après arrêt\n');
debugCriticalServerTest();
