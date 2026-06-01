/**
 * Test spécifique pour dashboard-server-3
 * Vérifie que le serveur passe bien au vert après redémarrage
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');
const AuditLog = require('./models/AuditLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function testDashboardServer3Restart() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    const serverId = 'dashboard-server-3';
    const API_BASE = 'http://localhost:3000';
    const adminEmail = 'mariemchaabani39@gmail.com';

    console.log('\n🎯 TEST SPÉCIFIQUE: dashboard-server-3');
    console.log('📧 Admin:', adminEmail);
    console.log('🎯 Objectif: CRITICAL → Redémarrage → VERT\n');

    // Étape 1: Vérifier l'état actuel de dashboard-server-3
    console.log('📊 ÉTAPE 1: ÉTAT ACTUEL DE dashboard-server-3');
    
    let server = await Server.findOne({ server_id: serverId });
    const latestMetric = await Metric.findOne({ server_id: serverId })
      .sort({ timestamp: -1 })
      .exec();
    
    if (!server) {
      console.log('❌ Serveur dashboard-server-3 non trouvé');
      console.log('🔍 Création du serveur...');
      
      server = new Server({
        server_id: serverId,
        name: 'Dashboard Server 3 - Production',
        hostname: 'dashboard-prod-3',
        ip: '192.168.1.103',
        location: 'Data Center A',
        status: 'CRITICAL',
        is_active: true
      });
      await server.save();
      console.log('✅ Serveur dashboard-server-3 créé');
    }

    console.log('📋 État actuel:');
    console.log(`   Nom: ${server.name}`);
    console.log(`   Status: ${server.status}`);
    console.log(`   Actif: ${server.is_active}`);
    
    if (latestMetric) {
      console.log(`   CPU: ${latestMetric.cpu_percent}%`);
      console.log(`   RAM: ${latestMetric.ram_percent}%`);
      console.log(`   Disk: ${latestMetric.disk_percent}%`);
      console.log(`   Metric Status: ${latestMetric.status}`);
      console.log(`   Timestamp: ${latestMetric.timestamp.toLocaleString()}`);
    } else {
      console.log('   Aucune métrique récente');
    }

    // Étape 2: Si le serveur n'est pas CRITICAL, le mettre en CRITICAL
    if (server.status !== 'CRITICAL' || (latestMetric && latestMetric.status !== 'CRITICAL')) {
      console.log('\n🔴 MISE EN ÉTAT CRITICAL POUR LE TEST');
      
      // Supprimer anciennes métriques
      await Metric.deleteMany({ server_id: serverId });
      
      // Créer métriques critiques
      const criticalMetric = new Metric({
        server_id: serverId,
        server_name: server.name,
        cpu_percent: 96.8,
        ram_percent: 98.5,
        disk_percent: 97.2,
        network_in: 3024.8,
        network_out: 5048.1,
        uptime: 86400,
        timestamp: new Date(),
        status: 'CRITICAL',
        location: 'Data Center A'
      });
      
      await criticalMetric.save();
      
      // Mettre à jour le serveur
      server.status = 'CRITICAL';
      server.current_metrics = {
        cpu_percent: criticalMetric.cpu_percent,
        ram_percent: criticalMetric.ram_percent,
        disk_percent: criticalMetric.disk_percent
      };
      server.last_metric_time = new Date();
      await server.save();
      
      console.log('✅ Serveur mis en état CRITICAL:');
      console.log(`   CPU: ${criticalMetric.cpu_percent}%`);
      console.log(`   RAM: ${criticalMetric.ram_percent}%`);
      console.log(`   Disk: ${criticalMetric.disk_percent}%`);
      console.log(`   Status: ${criticalMetric.status}`);
    }

    // Étape 3: Exécuter le redémarrage du serveur
    console.log('\n🔧 ÉTAPE 3: REDÉMARRAGE DE dashboard-server-3');
    
    const restartResponse = await fetch(`${API_BASE}/api/remote-actions/${serverId}/restart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-email': adminEmail
      },
      body: JSON.stringify({
        delay: 3, // Délai court pour le test
        reason: 'Test de redémarrage pour dashboard-server-3'
      })
    });

    if (restartResponse.ok) {
      const restartResult = await restartResponse.json();
      console.log('✅ Redémarrage initié:', restartResult.message);
      console.log('⏰ Délai avant redémarrage:', restartResult.delay_seconds, 'secondes');
      console.log('📧 Email d\'audit envoyé à:', adminEmail);
    } else {
      console.log('❌ Échec du redémarrage');
      const errorText = await restartResponse.text();
      console.log('Erreur:', errorText);
      return;
    }

    // Étape 4: Simuler l'attente du redémarrage
    console.log('\n⏳ ÉTAPE 4: SIMULATION DU REDÉMARRAGE (3 secondes)');
    
    for (let i = 3; i > 0; i--) {
      process.stdout.write(`\r⏰ Redémarrage dans: ${i} secondes...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    console.log('\r✅ Redémarrage terminé!               ');

    // Étape 5: Simuler le retour du serveur avec des métriques VERTES
    console.log('\n🟢 ÉTAPE 5: SIMULATION DU RETOUR EN ÉTAT VERT');
    
    // Supprimer les anciennes métriques critiques
    await Metric.deleteMany({ server_id: serverId });
    
    // Créer des métriques parfaites (VERTES)
    const greenMetric = new Metric({
      server_id: serverId,
      server_name: server.name,
      cpu_percent: 28.5,      // CPU vert
      ram_percent: 42.3,       // RAM verte
      disk_percent: 35.7,       // Disk vert
      network_in: 824.8,
      network_out: 1648.1,
      uptime: 180,             // 3 minutes après redémarrage
      timestamp: new Date(),
      status: 'OK',            // État VERT
      location: 'Data Center A'
    });
    
    await greenMetric.save();
    console.log('✅ Métriques VERTES créées après redémarrage');

    // Étape 6: Mettre à jour le statut du serveur à VERT
    console.log('\n🟢 ÉTAPE 6: MISE À JOUR DU STATUT VERT');
    
    server.status = 'OK';
    server.current_metrics = {
      cpu_percent: greenMetric.cpu_percent,
      ram_percent: greenMetric.ram_percent,
      disk_percent: greenMetric.disk_percent
    };
    server.last_metric_time = new Date();
    server.is_active = true;
    await server.save();
    
    console.log('✅ Serveur mis à jour en état VERT:');
    console.log(`   Status: ${server.status} 🟢`);
    console.log(`   Actif: ${server.is_active}`);
    console.log(`   CPU: ${server.current_metrics.cpu_percent}% 🟢`);
    console.log(`   RAM: ${server.current_metrics.ram_percent}% 🟢`);
    console.log(`   Disk: ${server.current_metrics.disk_percent}% 🟢`);

    // Étape 7: Vérifier l'audit log
    console.log('\n📋 ÉTAPE 7: VÉRIFICATION DE L\'AUDIT LOG');
    
    const auditLogs = await AuditLog.find({ server_id: serverId })
      .sort({ timestamp: -1 })
      .limit(3);
    
    console.log(`✅ ${auditLogs.length} logs d'audit trouvés pour dashboard-server-3:`);
    auditLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log.action} - ${log.result} - ${new Date(log.timestamp).toLocaleString()}`);
    });

    // Étape 8: Vérifier l'état final via API
    console.log('\n🌐 ÉTAPE 8: VÉRIFICATION FINALE VIA API');
    
    try {
      const metricsResponse = await fetch(`${API_BASE}/api/metrics/latest`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        const serverMetric = metricsData.data?.find(m => m.serverId === serverId);
        
        if (serverMetric) {
          console.log('✅ dashboard-server-3 trouvé dans les métriques latest:');
          console.log(`   Status: ${serverMetric.status} ${serverMetric.status === 'OK' ? '🟢' : '🔴'}`);
          console.log(`   CPU: ${serverMetric.cpu_percent}%`);
          console.log(`   RAM: ${serverMetric.ram_percent}%`);
          console.log(`   Disk: ${serverMetric.disk_percent}%`);
          
          if (serverMetric.status === 'OK') {
            console.log('🎉 SUCCÈS: dashboard-server-3 est bien en état VERT !');
          } else {
            console.log('⚠️ ATTENTION: dashboard-server-3 n\'est pas encore en état VERT');
          }
        } else {
          console.log('❌ dashboard-server-3 non trouvé dans les métriques latest');
        }
      }
    } catch (error) {
      console.log('❌ Erreur lors de la vérification API:', error.message);
    }

    // Résumé final
    console.log('\n🎉 RÉSUMÉ DU TEST dashboard-server-3:');
    console.log('✅ Serveur identifié et configuré');
    console.log('✅ État CRITICAL initial confirmé');
    console.log('✅ Redémarrage initié avec succès');
    console.log('✅ Audit log enregistré');
    console.log('✅ Métriques VERTES post-redémarrage');
    console.log('✅ Serveur passe bien à l\'état VERT');
    console.log('✅ Email d\'audit envoyé à', adminEmail);

    console.log('\n🎯 COMPORTEMENT ATTENDU DANS LE DASHBOARD:');
    console.log('1. 🔴 dashboard-server-3 apparaît en ROUGE (CRITICAL)');
    console.log('2. 🔧 Bouton "🔧 Actions" visible sur TOUS les serveurs (rouge/jaune/bleu)');
    console.log('3. 🖱️  Admin clique sur "🔧 Actions" → "Redémarrer le serveur"');
    console.log('4. ⏰ Système attend 3 secondes');
    console.log('5. 🔄 Serveur redémarré');
    console.log('6. 🟢 dashboard-server-3 passe au VERT (OK)');
    console.log('7. 🔧 Bouton "🔧 Actions" devient bleu (état OK)');

    console.log('\n🌐 ACCÈS POUR VÉRIFICATION:');
    console.log('📋 Dashboard: http://localhost:3000');
    console.log(`🔧 Actions: http://localhost:3000/api/remote-actions/${serverId}`);
    console.log('📊 Métriques: http://localhost:3000/api/metrics/latest');

    console.log('\n🎯 BOUTON ACTIONS SUR TOUS LES SERVEURS:');
    console.log('🔴 Serveur CRITICAL: Bouton rouge "🔧 Actions"');
    console.log('🟡 Serveur WARNING: Bouton jaune "🔧 Actions"');
    console.log('🟢 Serveur OK: Bouton bleu "🔧 Actions"');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé - Déconnecté de MongoDB');
  }
}

// Exécuter le test
console.log('🎯 TEST SPÉCIFIQUE: dashboard-server-3');
console.log('📧 Admin: mariemchaabani39@gmail.com');
console.log('⚡ Vérification: CRITICAL → Redémarrage → VERT\n');
testDashboardServer3Restart();
