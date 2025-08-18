import mongoose from 'mongoose';

const templateCertSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url: { type: String , required: true},
  description: { type: String }
}, {
  timestamps: true
});

const templateCert = mongoose.model('templateCert', templateCertSchema);
export default templateCert;