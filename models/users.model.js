import { ObjectId } from 'mongodb'
import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String,
    default: ""
  },
  skills: {
    type: [String],
    default: []
  },
  preferredFields: {
    type: [String],
    default: []
  },
  joinedCampaigns: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign'
  }],
  certificates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  }],
  role: {
    type: String,
    enum: ['user', 'admin', 'organization', 'manager'],
    default: 'user'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'inactive'
  },
  date_of_birth: {
    type: Date,
    required: true
  },
  bio: {
    type: String
  },
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  communeId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommuneInfo' },

}, { timestamps: true });

const User = mongoose.model('User', userSchema)

export default User
