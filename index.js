const mqtt   = require('mqtt');
const admin  = require('firebase-admin');

// If you put the whole serviceAccount JSON into an env-var:
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL
});

const db = admin.database();

// Configure MQTT from env-vars
const mqttOptions = {
  host:     process.env.MQTT_BROKER_URL,
  port:     1883,
  username: process.env.MQTT_USERNAME || undefined,
  password: process.env.MQTT_PASSWORD || undefined,
  protocol: 'mqtt'
};

const client = mqtt.connect(mqttOptions);

// When connected, subscribe to your topic
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker:', process.env.MQTT_BROKER_URL);
  client.subscribe('patient1/sensors');
});

// On each message, parse JSON and update Firebase
client.on('message', (topic, message) => {
  console.log(`⇨ ${topic} → ${message}`);
  let data;
  try {
    data = JSON.parse(message.toString());
  } catch (e) {
    return console.error('Invalid JSON', e);
  }
  db.ref('patients/patient1').update({
    heartRate:      data.heartRate,
    spo2:           data.spo2,
    temperature:    data.temperature,
    lastUpdateTime: new Date().toISOString()
  }).then(() => {
    console.log('✔ Firebase updated');
  }).catch(err => {
    console.error('✖ Firebase update failed', err);
  });
});
