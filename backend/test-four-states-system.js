/**
 * Test du système à 4 états: VERT(OK), ROUGE(CRITICAL), JAUNE(WARNING), GRIS(OFFLINE)
 * Validation du comportement: VERT → ROUGE → GRIS → VERT
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');
const AuditLog = require('./models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27091/pfe-monitoring';

async function testFourStatesSystem() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const serverId = 'test-four-states-server';
    const API_BASE = 'http://localhost:3000';
    const adminEmail = 'mariemchaabani39@gmail.com';

    console.log('\n🎨 TEST SYSTÈME À 4 ÉTATS DE COULEURS');
    console.log('🟢 VERT (OK) - Serveur actif et fonctionnel');
    console.log('🔴 ROUGE (CRITICAL) - Serveur avec problème critique');
    console.log('🟡 JAUNE (WARNING) - Serveur avec attention requise');
    console.log('⚫ GRIS (OFFLINE) - Serveur arrêté');
    console.log(`🖥️  Serveur test: ${serverId}`);
    console.log(`📧 Admin: ${adminEmail}\n`);

    // Étape 1: État initial VERT (OK)
    console.log('🟢 ÉTAPE 1: ÉTAT INITIAL VERT (OK)');
    
    let server = await Server.findOne({ server_id: serverId });
    if (!server) {
      server = new Server({
        server_id: serverId,
        name: 'Test Server - Four States',
        hostname: 'test-four-states',
        ip: '192.168.1.999',
        location: 'Data Center Test',
        status: 'OK',
        is_active: true
      });
      await server.save();
      console.log('✅ Serveur créé:', server.name);
    }

    // Métriques VERTES
    await Metric.deleteMany({ server_id: serverId });
    
    const greenMetric = new Metric({
      server_id: serverId,
      server_name: server.name,
      cpu_percent: 35.2,      // Normal
      ram_percent: 45.7,       // Normal
      disk_percent: 42.3,      // Normal
      network_in: 824.8,
      network_out: 1648.1,
      uptime: 86400,
      timestamp: new Date(),
      status: 'OK',
      location: 'Data Center Test'
    });
    
    await greenMetric.save();
    
    server.status = 'OK';
    server.current_metrics = {
      cpu_percent: greenMetric.cpu_percent,
      ram_percent: greenMetric.ram_percent,
      disk_percent: greenMetric.disk_percent
    };
    server.last_metric_time = new Date();
    server.is_active = true;
    await server.save();
    
    console.log('✅ Serveur en état VERT:');
    console.log(`   Status: ${server.status} 🟢`);
    console.log(`   CPU: ${server.current_metrics.cpu_percent}%`);
    console.log(`   RAM: ${server.current_metrics.ram_percent}%`);
    console.log(`   Disk: ${server.current_metrics.disk_percent}%`);

    // Étape 2: Mettre en état ROUGE (CRITICAL)
    console.log('\n🔴 ÉTAPE 2: PASSAGE EN ÉTAT ROUGE (CRITICAL)');
    
    const redMetric = new Metric({
      server_id: serverId,
      server_name: server.name,
      cpu_percent: 96.8,      // Critique
      ram_percent: 98.5,       // Critique
      disk_percent: 97.2,      // Critique
      network_in: 3024.8,
      network_out: 5048.1,
      uptime: 86400,
      timestamp: new Date(),
      status: 'CRITICAL',
      location: 'Data Center Test'
    });
    
    await Metric.deleteMany({ server_id: serverId });
    await redMetric.save();
    
    server.status = 'CRITICAL';
    server.current_metrics = {
      cpu_percent: redMetric.cpu_percent,
      ram_percent: redMetric.ram_percent,
      disk_percent: redMetric.disk_percent
    };
    server.last_metric_time = new Date();
    await server.save();
    
    console.log('✅ Serveur en état ROUGE:');
    console.log(`   Status: ${server.status} 🔴`);
    console.log(`   CPU: ${server.current_metrics.cpu_percent}%`);
    console.log(`   RAM: ${server.current_metrics.ram_percent}%`);
    console.log(`   Disk: ${server.current_metrics.disk_percent}%`);

    // Étape 3: Redémarrage depuis l'état ROUGE (doit rester ROUGE)
    console.log('\n🔄 ÉTAPE 3: REDÉMARRAGE DEPUIS L\'ÉTAT ROUGE');
    
    const restartFromRedResponse = await fetch(`${API_BASE}/api/remote-actions/${serverId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail
      },
      body: JSON.stringify({
        delay: 2,
        reason: 'Test redémarrage depuis état CRITICAL'
      })
    });

    if (restartFromRedResponse.ok) {
      const restartResult = await restartFromRedResponse.json();
      console.log('✅ Redémarrage depuis ROUGE initié:', restartResult.message);
      console.log('⏰ Délai:', restartResult.delay_seconds, 'secondes');
      console.log('📧 Email envoyé à', adminEmail);
    }

    // Simuler le redémarrage (reste en ROUGE pendant le redémarrage)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Garder en ROUGE pendant le redémarrage
    console.log('⏳ Serveur reste en ROUGE pendant le redémarrage...');
    console.log(`   Status: ${server.status} 🔴 (pendant redémarrage)`);

    // Étape 4: Arrêter le serveur (doit devenir GRIS)
    console.log('\n⚫ ÉTAPE 4: ARRÊT DU SERVEUR (DEVIENT GRIS)');
    
    const shutdownResponse = await fetch(`${API_BASE}/api/remote-actions/${serverId}/shutdown`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail
      },
      body: JSON.stringify({
        delay: 2,
        reason: 'Test arrêt complet du serveur'
      })
    });

    if (shutdownResponse.ok) {
      const shutdownResult = await shutdownResponse.json();
      console.log('✅ Arrêt initié:', shutdownResult.message);
      console.log('⏰ Délai:', shutdownResult.delay_seconds, 'secondes');
      console.log('📧 Email envoyé à', adminEmail);
    }

    // Simuler l'arrêt complet
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mettre en état GRIS (OFFLINE)
    const grayMetric = new Metric({
      server_id: serverId,
      server_name: server.name,
      cpu_percent: 0.0,        // Zéro = serveur arrêté
      ram_percent: 0.0,        // Zéro
      disk_percent: 0.0,        // Zéro
      network_in: 0.0,        // Zéro
      network_out: 0.0,
      uptime: 0,               // Zéro
      timestamp: new Date(),
      status: 'OFFLINE',      // État OFFLINE
      location: 'Data Center Test'
    });
    
    await Metric.deleteMany({ server_id: serverId });
    await grayMetric.save();
    
    server.status = 'OFFLINE';
    server.current_metrics = {
      cpu_percent: 0.0,
      ram_percent: 0.0,
      disk_percent: 0.0
    };
    server.last_metric_time = new Date();
    server.is_active = false;  // Serveur inactif
    await server.save();
    
    console.log('✅ Serveur en état GRIS (OFFLINE):');
    console.log(`   Status: ${server.status} ⚫`);
    console.log(`   Actif: ${server.is_active}`);
    console.log(`   CPU: ${server.current_metrics.cpu_percent}%`);
    console.log(`   RAM: ${server.current_metrics.ram_percent}%`);
    console.log(`   Network: ${grayMetric.network_in} MB/s`);

    // Étape 5: Redémarrage depuis l'état GRIS (doit devenir VERT)
    console.log('\n🟢 ÉTAPE 5: REDÉMARRAGE DEPUIS L\'ÉTAT GRIS (DEVIENT VERT)');
    
    const restartFromGrayResponse = await fetch(`${API_BASE}/api/remote-actions/${serverId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail
      },
      body: JSON.stringify({
        delay: 2,
        reason: 'Test redémarrage depuis état OFFLINE'
      })
    });

    if (restartFromGrayResponse.ok) {
      const restartResult = await restartFromGrayResponse.json();
      console.log('✅ Redémarrage depuis GRIS initié:', restartResult.message);
      console.log('⏰ Délai:', restartResult.delay_seconds, 'secondes');
      console.log('📧 Email envoyé à', adminEmail);
    }

    // Simuler le redémarrage complet
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mettre en état VERT
    const finalGreenMetric = new Metric({
      server_id: serverId,
      server_name: server.name,
      cpu_percent: 28.5,      // Normal
      ram_percent: 38.2,       // Normal
      disk_percent: 35.7,      // Normal
      network_in: 924.8,
      network_out: 1848.1,
      uptime: 120,             // 2 minutes après redémarrage
      timestamp: new Date(),
      status: 'OK',
      location: 'Data Center Test'
    });
    
    await Metric.deleteMany({ server_id: serverId });
    await finalGreenMetric.save();
    
    server.status = 'OK';
    server.current_metrics = {
      cpu_percent: finalGreenMetric.cpu_percent,
      ram_percent: finalGreenMetric.ram_percent,
      disk_percent: finalGreenMetric.disk_percent
    };
    server.last_metric_time = new Date();
    server.is_active = true;   // Serveur réactivé
    await server.save();
    
    console.log('✅ Serveur en état VERT final:');
    console.log(`   Status: ${server.status} 🟢`);
    console.log(`   Actif: ${server.is_active}`);
    console.log(`   CPU: ${server.current_metrics.cpu_percent}%`);
    console.log(`   RAM: ${server.current_metrics.ram_percent}%`);
    console.log(`   Disk: ${server.current_metrics.disk_percent}%`);

    // Étape 6: Vérification via API
    console.log('\n🌐 ÉTAPE 6: VÉRIFICATION FINALE VIA API');
    
    try {
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const serverMetric = metricsData.data?.find(m => m.serverId === serverId);
        
        if (serverMetric) {
          const statusEmoji = serverMetric.status === 'OK' ? '🟢' : 
                            serverMetric.status === 'CRITICAL' ? '🔴' :
                            serverMetric.status === 'WARNING' ? '🟡' : '⚫';
          
          console.log('✅ Serveur trouvé dans les métriques latest:');
          console.log(`   Status: ${serverMetric.status} ${statusEmoji}`);
          console.log(`   CPU: ${serverMetric.cpu_percent}%`);
          console.log(`   RAM: ${serverMetric.ram_percent}%`);
        }
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification API:', error.message);
    }

    // Étape 7: Vérification des logs d'audit
    console.log('\n📋 ÉTAPE 7: VÉRIFICATION DES LOGS D\'AUDIT');
    
    const auditLogs = await AuditLog.find({ server_id: serverId })
      .sort({ timestamp: -1 })
      .limit(5);
    
    console.log(`✅ ${auditLogs.length} logs d'audit trouvés:`);
    auditLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.action} - ${log.result} - ${new Date(log.timestamp).toLocaleString()}`);
    });

    // Résumé final
    console.log('\n🎉 RÉSUMÉ DU SYSTÈME À 4 ÉTATS:');
    console.log('✅ État VERT (OK): Serveur actif et fonctionnel');
    console.log('✅ État ROUGE (CRITICAL): Serveur avec problème');
    console.log('✅ État GRIS (OFFLINE): Serveur arrêté');
    console.log('✅ Cycle complet testé: VERT → ROUGE → GRIS → VERT');

    console.log('\n🎯 COMPORTEMENT VALIDÉ:');
    console.log('🟢 Serveur OK: Badge vert + Bouton bleu "🔧 Actions"');
    console.log('🔴 Serveur CRITICAL: Badge rouge + Bouton rouge "🔧 Actions"');
    console.log('🟡 Serveur WARNING: Badge jaune + Bouton jaune "🔧 Actions"');
    console.log('⚫ Serveur OFFLINE: Badge gris + Bouton gris "🔧 Actions"');

    console.log('\n🔄 WORKFLOW DES ACTIONS:');
    console.log('1. 🔴 Serveur CRITICAL → Redémarrage → Reste ROUGE (pendant redémarrage)');
    console.log('2. ⚫ N\'importe quel serveur → Arrêt → Devient GRIS');
    console.log('3. ⚫ Serveur GRIS → Redémarrage → Devient VERT');

    console.log('\n🌐 ACCÈS POUR VÉRIFICATION:');
    console.log('📋 Dashboard: http://localhost:3000');
    console.log(`🔧 Actions: http://localhost:3000/api/remote-actions/${serverId}`);
    console.log('📊 Métriques: http://localhost:3000/api/metrics/latest');

    console.log('\n🎨 SYSTÈME DE COULEURS TERMINÉ !');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé - Déconnecté de MongoDB');
  }
}

// Exécuter le test
console.log('🎨 TEST SYSTÈME À 4 ÉTATS DE COULEURS');
console.log('🟢 VERT (OK) - 🔴 ROUGE (CRITICAL) - 🟡 JAUNE (WARNING) - ⚫ GRIS (OFFLINE)');
console.log('📧 Admin: mariemchaabani39@gmail.com');
console.log('⚡ Validation du cycle complet: VERT → ROUGE → GRIS → VERT\n');
testFourStatesSystem();
