import mongoose from 'mongoose';

const ownershipSegmentSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    from: {
      type: Date,
      required: true
    },
    to: {
      type: Date,
      default: null // null indicates current active owner
    }
  },
  { _id: true }
);

const subscriptionSchema = new mongoose.Schema(
  {
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan is required']
    },
    cycleStartDate: {
      type: Date,
      required: [true, 'Original cycle start date is required']
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
      index: true
    },
    currentCustomerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Current customer ID is required'],
      index: true
    },
    ownershipHistory: {
      type: [ownershipSegmentSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
