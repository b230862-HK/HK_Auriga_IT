import mongoose from 'mongoose';

const pauseRecordSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      default: null // null indicates paused indefinitely until resumed
    },
    isResumed: {
      type: Boolean,
      default: false
    },
    resumedAt: {
      type: Date,
      default: null
    },
    reason: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const PauseRecord = mongoose.model('PauseRecord', pauseRecordSchema);
