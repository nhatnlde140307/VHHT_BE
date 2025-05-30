import mongoose from 'mongoose';

const { Schema } = mongoose;

// ✅ Sub-schema cho giai đoạn
const phaseSchema = new Schema({
  name: { type: String, required: true },
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  description: { type: String }
}); // ✅ BỊ THIẾU dấu đóng ngoặc ở đây

// ✅ Schema chính cho Campaign hoặc Event
const campaignSchema = new Schema({
  name: { type: String, required: true },

  type: {
    type: String,
    enum: ["campaign", "event"],
    required: true
  },

  description: { type: String, required: true },

  location: {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point"
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },

  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },

  image: { type: String }, // Link ảnh đại diện

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // hoặc 'Admin'
    required: true
  },

  // Chỉ dùng cho campaign
  departments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  }],

  phases: [phaseSchema], // Chỉ áp dụng cho campaign

  // Chỉ dùng cho event
  volunteerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Volunteer'
  }],

  status: {
    type: String,
    enum: ["upcoming", "in-progress", "completed"],
    default: "upcoming"
  }

}, {
  timestamps: true // tự tạo createdAt & updatedAt
});

// ✅ Tạo chỉ mục vị trí để truy vấn theo tọa độ
campaignSchema.index({ location: "2dsphere" });

const Campaign = mongoose.model('Campaign', campaignSchema);
export default Campaign;