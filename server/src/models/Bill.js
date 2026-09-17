import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      required: [true, 'Subscription ID is required'],
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer ID is required'],
      index: true
    },
    month: {
      type: String,
      required: [true, 'Billing month (YYYY-MM) is required'],
      match: [/^\d{4}-\d{2}$/, 'Billing month must be in YYYY-MM format'],
      index: true
    },
    totalWeekdays: {
      type: Number,
      required: true,
      default: 0
    },
    pausedWeekdays: {
      type: Number,
      required: true,
      default: 0
    },
    billableDays: {
      type: Number,
      required: true,
      default: 0
    },
    dailyRate: {
      type: Number,
      required: true,
      default: 0
    },
    finalAmount: {
      type: Number,
      required: true,
      default: 0
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    isTransferred: {
      type: Boolean,
      default: false
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index so a customer has at most one bill per subscription per month
billSchema.index({ subscriptionId: 1, customerId: 1, month: 1 }, { unique: true });

export const Bill = mongoose.model('Bill', billSchema);
