const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
};

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: 'https://starfox1230.github.io' // Replace with your GitHub Pages URL (e.g., https://your-username.github.io/progress-tracker/)
}));
app.use(express.json());

// API Endpoints

/**
 * Get global progress data
 */
app.get('/getProgress', async (req, res) => {
  try {
    const doc = await db.collection('progress').doc('global').get();
    if (!doc.exists) {
      // If document doesn't exist, initialize with default values
      const defaultData = {
        trauma: 0,
        upper: 0,
        lower: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('progress').doc('global').set(defaultData);
      return res.json(defaultData);
    } else {
      return res.json(doc.data());
    }
  } catch (error) {
    console.error('Error getting progress:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Update global progress data
 * Expects query parameters: category=trauma|upper|lower and value=number
 */
app.post('/updateProgress', async (req, res) => {
  const { category, value } = req.body;
  if (!category || typeof value !== 'number') {
    return res.status(400).json({ error: 'Missing or invalid parameters' });
  }

  if (!['trauma', 'upper', 'lower'].includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  try {
    const docRef = db.collection('progress').doc('global');
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Progress document not found' });
    }

    await docRef.update({
      [category]: admin.firestore.FieldValue.increment(value)
    });

    const updatedDoc = await docRef.get();
    return res.json(updatedDoc.data());
  } catch (error) {
    console.error('Error updating progress:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * Reset global progress data
 */
app.post('/resetProgress', async (req, res) => {
  try {
    const docRef = db.collection('progress').doc('global');
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Progress document not found' });
    }

    await docRef.update({
      trauma: 0,
      upper: 0,
      lower: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await docRef.get();
    return res.json(updatedDoc.data());
  } catch (error) {
    console.error('Error resetting progress:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
