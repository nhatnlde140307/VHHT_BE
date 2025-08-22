// models/reliefPoint.model.js
import mongoose from 'mongoose';

const { Schema } = mongoose;

const rescueProofSchema = new Schema({
  images: [String],
  note: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const rescueEntrySchema = new Schema({
  rescuedAt: { type: Date, default: Date.now },
  rescueNote: String,
  rescueProofs: [rescueProofSchema]
}, { _id: false });

const reliefPointSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    address: String,

    type: { type: String, enum: ['need', 'supply'], required: true },

    stormId: { type: Schema.Types.ObjectId, ref: 'Storm' },

    needs: [{
      type: { type: String, enum: ['người mắc kẹt','bị thương','thiếu đồ ăn','thiếu nước','thiếu thuốc','khác'] },
      quantity: Number,
      note: String
    }],

    surplus: [{
      type: { type: String, enum: ['thực phẩm','nước uống','quần áo','thuốc men','chăn màn','dụng cụ y tế','khác'] },
      quantity: Number,
      note: String
    }],

    status: { type: String, enum: ['pending', 'in-progress', 'resolved', 'rejected'], default: 'pending' },
    contact: String,

    verified: { type: Boolean, default: false },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    responders: [{
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      note: String,
      joinedAt: Date
    }],

    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }
    },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Rescue
    rescueStatus: { type: Boolean, default: false },
    rescueList: [rescueEntrySchema]
  },
  { timestamps: true }
);

reliefPointSchema.index({ location: '2dsphere' });

export default mongoose.model('ReliefPoint', reliefPointSchema);
