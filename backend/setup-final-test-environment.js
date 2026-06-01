/**
 * Configuration de l'environnement de test final
 * Garde le service réel existant + ajoute 3 services de test
 * 2 services en état CRITICAL + 1 service en état normal (OK)
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27091/pfe-monitoring';

async function setupFinalTestEnvironment() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    console.log('\n🎯 CONFIGURATION ENVIRONNEMENT DE TEST FINAL');
    console.log('📧 Admin: mariemchaabani39@gmail.com');
    console.log('🎯 Objectif: 1 service réel + 3 services de test (2 CRITICAL + 1 OK)\n');

    // Étape 1: Identifier et garder le service réel existant
    console.log('🔍 ÉTAPE 1: IDENTIFICATION DU SERVICE RÉEL EXISTANT');
    
    const allServers = await Server.find({});
    console.log(`📋 ${allServers.length} serveurs trouvés au total:`);
    
    let realServers = [];
    let testServers = [];
    
    allServers.forEach(server => {
      if (server.server_id.includes('test') || 
          server.server_id.includes('dashboard-server') ||
          server.server_id.includes('critical-server')) {
        testServers.push(server);
        console.log(`   🧪 ${server.server_id} - ${server.name} (TEST)`);
      } else {
        realServers.push(server);
        console.log(`   🏢 ${server.server_id} - ${server.name} (RÉEL)`);
      }
    });
    
    console.log(`\n📊 Résumé:`);
    console.log(`   🏢 Services réels: ${realServers.length}`);
    console.log(`   🧪 Services de test: ${testServers.length}`);

    // Étape 2: Nettoyer les anciens services de test
    console.log('\n🧹 ÉTAPE 2: NETTOYAGE DES ANCIENS SERVICES DE TEST');
    
    for (const testServer of testServers) {
      await Metric.deleteMany({ server_id: testServer.server_id });
      await Server.deleteOne({ server_id: testServer.server_id });
      console.log(`   🗑️  Supprimé: ${testServer.server_id}`);
    }

    // Étape 3: Créer 3 nouveaux services de test
    console.log('\n➕ ÉTAPE 3: CRÉATION DES 3 NOUVEAUX SERVICES DE TEST');
    
    const newTestServers = [
      {
        server_id: 'test-critical-web',
        name: 'Test Critical Web Server',
        hostname: 'test-web-critical',
        ip: '192.168.1.201',
        location: 'Data Center Test',
        status: 'CRITICAL',
        is_active: true,
        cpu: 95.2,
        ram: 97.8,
        disk: 96.5
      },
      {
        server_id: 'test-critical-db',
        name: 'Test Critical Database Server',
        hostname: 'test-db-critical',
        ip: '192.168.1.202',
        location: 'Data Center Test',
        status: 'CRITICAL',
        is_active: true,
        cpu: 98.7,
        ram: 96.3,
        disk: 98.1
      },
      {
        server_id: 'test-normal-app',
        name: 'Test Normal Application Server',
        hostname: 'test-app-normal',
        ip: '192.168.1.203',
        location: 'Data Center Test',
        status: 'OK',
        is_active: true,
        cpu: 32.5,
        ram: 45.2,
        disk: 38.7
      }
    ];

    for (const serverData of newTestServers) {
      // Créer le serveur
      const server = new Server({
        server_id: serverData.server_id,
        name: serverData.name,
        hostname: serverData.hostname,
        ip: serverData.ip,
        location: serverData.location,
        status: serverData.status,
        is_active: serverData.is_active
      });
      await server.save();

      // Créer les métriques appropriées
      const metric = new Metric({
        server_id: serverData.server_id,
        server_name: serverData.name,
        cpu_percent: serverData.cpu,
        ram_percent: serverData.ram,
        disk_percent: serverData.disk,
        network_in: serverData.status === 'CRITICAL' ? 3000 + Math.random() * 2000 : 500 + Math.random() * 500,
        network_out: serverData.status === 'CRITICAL' ? 5000 + Math.random() * 2000 : 1000 + Math.random() * 500,
        uptime: 86400,
        timestamp: new Date(),
        status: serverData.status,
        location: serverData.location
      });
      
      await metric.save();

      // Mettre à jour les métriques actuelles du serveur
      server.current_metrics = {
        cpu_percent: serverData.cpu,
        ram_percent: serverData.ram,
        disk_percent: serverData.disk
      };
      server.last_metric_time = new Date();
      await server.save();

      const statusEmoji = serverData.status === 'CRITICAL' ? '🔴' : '🟢';
      console.log(`   ✅ ${serverData.server_id}: ${serverData.name} - ${serverData.status} ${statusEmoji}`);
      console.log(`      CPU: ${serverData.cpu}% | RAM: ${serverData.ram}% | Disk: ${serverData.disk}%`);
    }

    // Étape 4: Vérification finale
    console.log('\n🌐 ÉTAPE 4: VÉRIFICATION FINALE VIA API');
    
    try {
      const API_BASE = 'http://localhost:3000';
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        console.log(`✅ ${metricsData.data?.length || 0} serveurs trouvés dans latest`);
        
        let criticalCount = 0;
        let okCount = 0;
        let realCount = 0;
        
        metricsData.data?.forEach(metric => {
          const statusEmoji = metric.status === 'CRITICAL' ? '🔴' : 
                            metric.status === 'OK' ? '🟢' :
                            metric.status === 'WARNING' ? '🟡' : '⚫';
          
          if (metric.serverId.includes('test')) {
            console.log(`   🧪 ${metric.serverId}: ${metric.status} ${statusEmoji}`);
            if (metric.status === 'CRITICAL') criticalCount++;
            if (metric.status === 'OK') okCount++;
          } else {
            console.log(`   🏢 ${metric.serverId}: ${metric.status} ${statusEmoji}`);
            realCount++;
          }
        });
        
        console.log(`\n📊 Résumé final:`);
        console.log(`   🏢 Services réels: ${realCount}`);
        console.log(`   🔴 Services CRITICAL: ${criticalCount}`);
        console.log(`   🟢 Services OK: ${okCount}`);
        console.log(`   🧪 Total services de test: ${criticalCount + okCount}`);
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification API:', error.message);
    }

    // Résumé final
    console.log('\n🎉 ENVIRONNEMENT DE TEST FINAL CONFIGURÉ !');
    console.log('✅ Services réels préservés avec leur état actuel');
    console.log('✅ 3 nouveaux services de test créés');
    console.log('✅ 2 services en état CRITICAL (rouge)');
    console.log('✅ 1 service en état normal (vert)');

    console.log('\n🎯 CONFIGURATION FINALE:');
    console.log('🏢 Services réels: Gardés inchangés');
    console.log('🧪 Services de test:');
    console.log('   🔴 test-critical-web - Serveur Web CRITICAL');
    console.log('   🔴 test-critical-db - Serveur Database CRITICAL');
    console.log('   🟢 test-normal-app - Serveur Application OK');

    console.log('\n🌐 ACCÈS POUR VÉRIFICATION:');
    console.log('📋 Dashboard: http://localhost:3000');
    console.log('🔍 Vous devriez voir:');
    console.log('   • Services réels avec leur état actuel');
    console.log('   • 2 serveurs rouges (CRITICAL) avec boutons rouges "🔧 Actions"');
    console.log('   • 1 serveur vert (OK) avec bouton bleu "🔧 Actions"');
    console.log('📧 Admin: mariemchaabani39@gmail.com');

    console.log('\n🎨 SYSTÈME PRÊT POUR TESTS COMPLETS !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Configuration terminée - Déconnecté de MongoDB');
  }
}

// Exécuter la configuration
console.log('🎯 CONFIGURATION ENVIRONNEMENT DE TEST FINAL');
console.log('📧 Admin: mariemchaabani39@gmail.com');
console.log('⚡ 1 service réel + 3 services de test (2 CRITICAL + 1 OK)\n');
setupFinalTestEnvironment();
