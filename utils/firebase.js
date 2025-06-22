const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require('../../firebaseServiceAccount.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'your-project-id.appspot.com', // 👈 sửa theo Firebase console
});

const bucket = admin.storage().bucket();

module.exports = { admin, bucket };