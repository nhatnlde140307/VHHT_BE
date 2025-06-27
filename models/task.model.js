import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
    phaseDayId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'PhaseDay',
        required: true
    },
    title: { type: String, required: true },
    description: { type: String },

    status: {
        status: {
            type: String,
            enum: ['not-started', 'in_progress', 'submitted', 'approved', 'rejected'],
            default: 'not-started'
        },
        submittedAt: Date,
        feedback: String,
        evaluation: {
            type: String,
            enum: ['excellent', 'good', 'average', 'poor']
        }
    },
    assignedUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        checkinTime: Date,
        checkoutTime: Date,

    }]
}, { timestamps: true });

export default mongoose.model('Task', taskSchema);