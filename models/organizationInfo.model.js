import mongoose from 'mongoose';

const { Schema } = mongoose;

const organizationInfoSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true 
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  website: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: '' 
  },
  verified: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const OrganizationInfo = mongoose.model('OrganizationInfo', organizationInfoSchema);

export default OrganizationInfo;