require('dotenv').config();
const mongoose = require('mongoose');
const Server = require('./models/Server');
const Metric = require('./models/Metric');
const Alert = require('./models/Alert');
const AuditLog = require('./models/AuditLog');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('NOW:', new Date().toISOString());
  const s = await Server.findOne({ server_id: 'vps-debian-ovh' }, 'status last_metric_time updatedAt is_active').lean();
  console.log('server:', JSON.stringify(s));
  const since = new Date(Date.now() - 8 * 60 * 1000);
  const metrics = await Metric.find({ server_id: 'vps-debian-ovh', createdAt: { $gte: since } }).sort({ createdAt: 1 }).select('status createdAt').lean();
  console.log('metrics since', since.toISOString(), ':');
  metrics.forEach(m => console.log(' ', m.createdAt, m.status));
  const alerts = await Alert.find({ serverId: 'vps-debian-ovh', updatedAt: { $gte: since } }).lean();
  console.log('alerts touched since:', alerts.length);
  alerts.forEach(a => console.log(' ', a.metric, a.type, a.status, a.updatedAt));
  const audits = await AuditLog.find({ server_id: 'vps-debian-ovh', createdAt: { $gte: since } }).lean();
  console.log('audit logs since:', audits.length);
  audits.forEach(a => console.log(' ', a.action, a.timestamp));
  await mongoose.disconnect();
})();
