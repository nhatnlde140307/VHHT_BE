import mongoose from 'mongoose';

const phaseSchema = new mongoose.Schema({
    campaignId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Campaign',
        required: true
    },
    name: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ["upcoming", "in-progress", "completed"],
        default: "upcoming"
    },
    phaseDays:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhaseDay'
    }]
}, { timestamps: true });

export default mongoose.model('Phase', phaseSchema);