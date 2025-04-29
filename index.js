const mqtt = require('mqtt');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://remote-patient-vitals-default-rtdb.firebaseio.com/' // Replace with your DB URL
});

const db = admin.database();
const ref = db.ref('patients/patient1');  // Patient node

const client = mqtt.connect('mqtt://test.mosquitto.org');

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  client.subscribe('patient1/sensors');
});

client.on('message', (topic, message) => {
  try {
    console.log(`Received MQTT: ${topic} => ${message.toString()}`);
    const data = JSON.parse(message.toString());

    if (data.heartRate && data.spo2 && data.temperature) {
      const now = new Date().toISOString(); // Current timestamp

      // Write to Firebase
      ref.update({
        heartRate: data.heartRate,
        spo2: data.spo2,
        temperature: data.temperature,
        lastUpdateTime: now
      }, err => {
        if (err) {
          console.error('Firebase write failed:', err);
        } else {
          console.log(`Firebase updated with: HR=${data.heartRate}, SpO2=${data.spo2}, Temp=${data.temperature}`);
        }
      });
    }
  } catch (err) {
    console.error('Error parsing or writing:', err.message);
  }
});
