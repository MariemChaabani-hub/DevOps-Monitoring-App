/**
 * Script de débogage pour vérifier la création des métriques OFFLINE
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27091/pfe-monitoring';

async function debugMetricsCreation() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    console.log('\n🔍 DÉBOGAGE: VÉRIFICATION DES MÉTRIQUES OFFLINE');

    // Vérifier les serveurs test-shutdown
    const testServers = ['test-shutdown-1', 'test-shutdown-2', 'test-shutdown-3'];
    
    for (const serverId of testServers) {
      console.log(`\n📊 Serveur: ${serverId}`);
      
      // Vérifier le serveur
      const server = await Server.findOne({ server_id: serverId });
      if (server) {
        console.log(`   Status serveur: ${server.status}`);
        console.log(`   Actif: ${server.is_active}`);
        console.log(`   Dernière métrique: ${server.last_metric_time || 'Jamais'}`);
      } else {
        console.log('   ❌ Serveur non trouvé');
        continue;
      }

      // Vérifier toutes les métriques pour ce serveur
      const allMetrics = await Metric.find({ server_id: serverId })
        .sort({ timestamp: -1 })
        .limit(5);
      
      console.log(`   📋 ${allMetrics.length} métriques trouvées:`);
      
      allMetrics.forEach((metric, index) => {
        console.log(`     ${index + 1}. Status: ${metric.status}`);
        console.log(`        CPU: ${metric.cpu_percent}%`);
        console.log(`        RAM: ${metric.ram_percent}%`);
        console.log(`        Timestamp: ${metric.timestamp.toLocaleString()}`);
        console.log(`        Network: ${metric.network_in || 0} MB/s`);
      });

      // Vérifier spécifiquement les métriques OFFLINE
      const offlineMetrics = await Metric.find({ 
        server_id: serverId, 
        status: 'OFFLINE' 
      }).sort({ timestamp: -1 });
      
      console.log(`   ⚫ Métriques OFFLINE: ${offlineMetrics.length}`);
      
      if (offlineMetrics.length === 0) {
        console.log('   ❌ Aucune métrique OFFLINE trouvée - PROBLÈME !');
        
        // Créer manuellement une métrique OFFLINE pour tester
        console.log('   🔧 Création manuelle d\'une métrique OFFLINE...');
        
        const manualOfflineMetric = new Metric({
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
          await manualOfflineMetric.save();
          console.log('   ✅ Métrique OFFLINE créée manuellement');
          
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
          console.log(`   ❌ Erreur création manuelle: ${error.message}`);
        }
      } else {
        console.log('   ✅ Métriques OFFLINE trouvées');
      }
    }

    // Vérification finale via API
    console.log('\n🌐 VÉRIFICATION VIA API');
    
    try {
      const API_BASE = 'http://localhost:3000';
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        console.log(`✅ ${metricsData.data?.length || 0} serveurs trouvés dans latest`);
        
        testServers.forEach(serverId => {
          const serverMetric = metricsData.data?.find(m => m.serverId === serverId);
          if (serverMetric) {
            const statusEmoji = serverMetric.status === 'OFFLINE' ? '⚫' : 
                              serverMetric.status === 'OK' ? '🟢' :
                              serverMetric.status === 'CRITICAL' ? '🔴' : '🟡';
            console.log(`   ${serverId}: ${serverMetric.status} ${statusEmoji}`);
          }
        });
      }
    } catch (error) {
      console.log('❌ Erreur API:', error.message);
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Débogage terminé');
  }
}

// Exécuter le débogage
console.log('🔍 DÉBOGAGE: VÉRIFICATION DES MÉTRIQUES OFFLINE');
console.log('⚡ Analyse pourquoi les serveurs ne deviennent pas GRIS\n');
debugMetricsCreation();
