// index.js
const mqtt  = require('mqtt');
const admin = require('firebase-admin');

// 1. Load service account credentials
let serviceAccount;
if (process.env.SERVICE_ACCOUNT_KEY) {
  try {
    serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
  } catch (err) {
    console.error('❌ Invalid SERVICE_ACCOUNT_KEY JSON:', err);
    process.exit(1);
  }
} else {
  console.warn('⚠️ SERVICE_ACCOUNT_KEY not set; falling back to local file');
  serviceAccount = require('./serviceAccountKey.json');
}

// 2. Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});
const db = admin.database();

// 3. Configure MQTT from env-vars
const mqttOptions = {
  host:     process.env.MQTT_BROKER_URL,
  port:     Number(process.env.MQTT_PORT) || 1883,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  protocol: 'mqtt'
};
const client = mqtt.connect(mqttOptions);

// 4. Dynamic patient/topic
const patientId = process.env.PATIENT_ID || 'patient1';
const topic     = `${patientId}/sensors`;

// 5. Connect & subscribe
client.on('connect', () => {
  console.log(`✅ Connected to MQTT broker: ${mqttOptions.host}`);
  client.subscribe(topic, err => {
    if (err) console.error(`❌ Subscribe failed on ${topic}:`, err);
    else     console.log(`📡 Subscribed to topic: ${topic}`);
  });
});

// 6. Handle incoming messages
client.on('message', (topicReceived, message) => {
  console.log(`⇨ ${topicReceived} → ${message}`);
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (e) {
    return console.error('❌ Invalid JSON payload:', e);
  }

  // Build only the fields we have
  const updates = {
    ...(data.heartRate   !== undefined && { heartRate:   data.heartRate   }),
    ...(data.spo2        !== undefined && { spo2:        data.spo2        }),
    ...(data.temperature !== undefined && { temperature: data.temperature }),
    lastUpdateTime: new Date().toISOString()
  };

  db.ref(`patients/${patientId}`)
    .update(updates)
    .then(() => console.log('✔ Firebase updated:', updates))
    .catch(err => console.error('✖ Firebase update failed:', err));
});
