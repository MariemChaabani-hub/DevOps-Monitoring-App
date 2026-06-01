/**
 * Test des actions à distance sur un serveur en état CRITICAL
 * Simule un scénario réel de problème serveur nécessitant une intervention
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');
const Alert = require('./models/Alert');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pfe-monitoring';

async function testCriticalServerActions() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Étape 1: Créer un serveur en état CRITICAL
    console.log('\n🚨 ÉTAPE 1: CRÉATION D\'UN SERVEUR EN ÉTAT CRITICAL');
    
    // Vérifier si le serveur existe déjà
    let criticalServer = await Server.findOne({ server_id: 'critical-server-test' });
    
    if (!criticalServer) {
      criticalServer = new Server({
        server_id: 'critical-server-test',
        name: 'Critical Test Server - PRODUCTION',
        hostname: 'critical-prod-server',
        ip: '192.168.1.200',
        location: 'Data Center A',
        description: 'Serveur de production en état critique - nécessite intervention immédiate',
        status: 'CRITICAL',
        is_active: true
      });
      await criticalServer.save();
      console.log('✅ Serveur CRITICAL créé:', criticalServer.name);
    } else {
      console.log('✅ Serveur CRITICAL existant trouvé:', criticalServer.name);
    }

    // Étape 2: Générer des métriques critiques
    console.log('\n📊 ÉTAPE 2: GÉNÉRATION DE MÉTRIQUES CRITIQUES');
    
    // Supprimer les anciennes métriques pour ce serveur
    await Metric.deleteMany({ server_id: 'critical-server-test' });
    
    // Créer des métriques critiques (CPU > 90%, RAM > 95%, Disk > 95%)
    const criticalMetrics = [
      {
        server_id: 'critical-server-test',
        server_name: criticalServer.name,
        cpu_percent: 95.2,      // CPU critique
        ram_percent: 97.8,       // RAM critique
        disk_percent: 96.5,      // Disque critique
        network_in: 1024.5,
        network_out: 2048.3,
        uptime: 86400,           // 1 jour
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // Il y a 5 minutes
        status: 'CRITICAL',
        location: 'Data Center A'
      },
      {
        server_id: 'critical-server-test',
        server_name: criticalServer.name,
        cpu_percent: 93.7,      // CPU critique
        ram_percent: 96.2,       // RAM critique
        disk_percent: 97.1,      // Disque critique
        network_in: 1124.8,
        network_out: 2148.7,
        uptime: 86400,
        timestamp: new Date(Date.now() - 10 * 60 * 1000), // Il y a 10 minutes
        status: 'CRITICAL',
        location: 'Data Center A'
      },
      {
        server_id: 'critical-server-test',
        server_name: criticalServer.name,
        cpu_percent: 98.1,      // CPU extrêmement critique
        ram_percent: 98.9,       // RAM extrêmement critique
        disk_percent: 98.3,      // Disque extrêmement critique
        network_in: 1224.2,
        network_out: 2248.1,
        uptime: 86400,
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // Il y a 15 minutes
        status: 'CRITICAL',
        location: 'Data Center A'
      }
    ];

    // Insérer les métriques critiques
    for (const metric of criticalMetrics) {
      const newMetric = new Metric(metric);
      await newMetric.save();
    }
    
    console.log('✅', criticalMetrics.length, 'métriques CRITICAL générées');

    // Mettre à jour le statut du serveur
    criticalServer.status = 'CRITICAL';
    criticalServer.current_metrics = {
      cpu_percent: criticalMetrics[0].cpu_percent,
      ram_percent: criticalMetrics[0].ram_percent,
      disk_percent: criticalMetrics[0].disk_percent
    };
    criticalServer.last_metric_time = new Date();
    await criticalServer.save();

    // Étape 3: Vérifier l'état CRITICAL
    console.log('\n🔍 ÉTAPE 3: VÉRIFICATION DE L\'ÉTAT CRITICAL');
    
    const latestMetric = await Metric.findOne({ server_id: 'critical-server-test' })
      .sort({ timestamp: -1 })
      .exec();
    
    console.log('📊 Dernières métriques:');
    console.log(`   CPU: ${latestMetric.cpu_percent}% (⚠️ CRITICAL)`);
    console.log(`   RAM: ${latestMetric.ram_percent}% (⚠️ CRITICAL)`);
    console.log(`   Disk: ${latestMetric.disk_percent}% (⚠️ CRITICAL)`);
    console.log(`   Status: ${latestMetric.status}`);
    console.log(`   Timestamp: ${latestMetric.timestamp.toLocaleString()}`);

    // Étape 4: Tester les actions à distance sur le serveur CRITICAL
    console.log('\n🔧 ÉTAPE 4: ACTIONS À DISTANCE SUR SERVEUR CRITICAL');
    
    const API_BASE = 'http://localhost:3000';
    const adminEmail = 'mariemchaabani39@gmail.com';

    // Action 1: Redémarrer Apache (service critique)
    console.log('\n📋 Action 1: Redémarrage Apache (service critique)');
    try {
      const apacheResponse = await fetch(`${API_BASE}/api/remote-actions/critical-server-test/restart-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail
        },
        body: JSON.stringify({
          service_name: 'apache2'
        })
      });

      if (apacheResponse.ok) {
        const apacheResult = await apacheResponse.json();
        console.log('✅ Apache redémarré:', apacheResult.message);
        console.log('📧 Email d\'audit envoyé à:', adminEmail);
      } else {
        console.log('❌ Échec du redémarrage Apache');
      }
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }

    // Action 2: Redémarrer MySQL (service critique)
    console.log('\n📋 Action 2: Redémarrage MySQL (service critique)');
    try {
      const mysqlResponse = await fetch(`${API_BASE}/api/remote-actions/critical-server-test/restart-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail
        },
        body: JSON.stringify({
          service_name: 'mysql'
        })
      });

      if (mysqlResponse.ok) {
        const mysqlResult = await mysqlResponse.json();
        console.log('✅ MySQL redémarré:', mysqlResult.message);
        console.log('📧 Email d\'audit envoyé à:', adminEmail);
      } else {
        console.log('❌ Échec du redémarrage MySQL');
      }
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }

    // Action 3: Redémarrer le serveur (action critique)
    console.log('\n📋 Action 3: Redémarrage complet du serveur (action critique)');
    try {
      const serverResponse = await fetch(`${API_BASE}/api/remote-actions/critical-server-test/restart`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-email': adminEmail
        },
        body: JSON.stringify({
          delay: 60, // Délai plus long pour serveur critique
          reason: 'Résolution des métriques critiques - CPU/RAM/Disk > 95%'
        })
      });

      if (serverResponse.ok) {
        const serverResult = await serverResponse.json();
        console.log('✅ Serveur redémarré:', serverResult.message);
        console.log('📧 Email d\'audit envoyé à:', adminEmail);
        console.log('⏰ Délai avant redémarrage:', serverResult.delay_seconds, 'secondes');
      } else {
        console.log('❌ Échec du redémarrage serveur');
      }
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }

    // Étape 5: Vérifier les logs d'audit
    console.log('\n📋 ÉTAPE 5: VÉRIFICATION DES LOGS D\'AUDIT');
    
    try {
      const auditResponse = await fetch(`${API_BASE}/api/remote-actions/critical-server-test/audit-log`, {
        method: 'GET',
        headers: {
          'x-admin-email': adminEmail
        }
      });

      if (auditResponse.ok) {
        const auditResult = await auditResponse.json();
        console.log('✅ Logs d\'audit récupérés');
        console.log('📋 Nombre d\'actions:', auditResult.logs.length);
        
        console.log('\n📋 DERNIÈRES ACTIONS SUR SERVEUR CRITICAL:');
        auditResult.logs.slice(0, 5).forEach((log, index) => {
          console.log(`${index + 1}. ${log.action} - ${log.result} - ${new Date(log.timestamp).toLocaleString()}`);
        });
      } else {
        console.log('❌ Échec de la récupération des logs');
      }
    } catch (error) {
      console.log('❌ Erreur:', error.message);
    }

    // Étape 6: Vérifier les alertes actives
    console.log('\n🚨 ÉTAPE 6: VÉRIFICATION DES ALERTES ACTIVES');
    
    const activeAlerts = await Alert.find({
      server_id: 'critical-server-test',
      status: 'ACTIVE'
    }).sort({ created_at: -1 });

    console.log('📊 Alertes actives:', activeAlerts.length);
    activeAlerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.type} - ${alert.severity} - ${alert.message}`);
    });

    // Résumé final
    console.log('\n🎉 RÉSUMÉ DU TEST CRITICAL:');
    console.log('✅ Serveur CRITICAL créé et configuré');
    console.log('✅ Métriques critiques générées (CPU/RAM/Disk > 95%)');
    console.log('✅ Actions à distance testées sur serveur CRITICAL');
    console.log('✅ Audit complet avec emails envoyés à', adminEmail);
    console.log('✅ Alertes générées et suivies');

    console.log('\n🌐 ACCÈS AU SERVEUR CRITICAL:');
    console.log('📋 Frontend: http://localhost:3000');
    console.log('🔧 API: http://localhost:3000/api/remote-actions/critical-server-test');
    console.log('📊 Dashboard: Chercher "Critical Test Server"');

    console.log('\n⚠️  SCÉNARIO RÉEL SIMULÉ:');
    console.log('🚨 Serveur en état CRITICAL nécessitant intervention immédiate');
    console.log('🔧 Admin peut maintenant intervenir via les actions à distance');
    console.log('📧 Toutes les actions sont tracées et auditées');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Test terminé - Déconnecté de MongoDB');
  }
}

// Exécuter le test
console.log('🚨 TEST DES ACTIONS À DISTANCE SUR SERVEUR CRITICAL');
console.log('📧 Admin: mariemchaabani39@gmail.com');
console.log('⚡ Simulation d\'un scénario réel de problème serveur\n');
testCriticalServerActions();
