import mongoose from 'mongoose';

const reliefPointSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    address: String,

    type: {
      type: String,
      enum: ['need', 'supply'], 
      required: true,
    },

    stormId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Storm',
    },

    needs: [{
      type: {
        type: String,
        enum: [
          'người mắc kẹt',
          'bị thương',
          'thiếu đồ ăn',
          'thiếu nước',
          'thiếu thuốc',
          'khác',
        ],
      },
      quantity: Number,
      note: String,
    }],

    surplus: [{
      type: {
        type: String,
        enum: [
          'thực phẩm',
          'nước uống',
          'quần áo',
          'thuốc men',
          'chăn màn',
          'dụng cụ y tế',
          'khác',
        ],
      },
      quantity: Number,
      note: String,
    }],

    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved', 'rejected'],
      default: 'pending',
    },
    contact:{
      type: String
    },

    verified: {
      type: Boolean,
      default: false,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    responders: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      note: String,
      joinedAt: Date,
    }],

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

reliefPointSchema.index({ location: '2dsphere' });

export default mongoose.model('ReliefPoint', reliefPointSchema);
