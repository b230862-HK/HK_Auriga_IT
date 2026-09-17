import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Plan',
      required: [true, 'Plan ID is required']
    },
    subscriptionStartDate: {
      type: Date,
      required: [true, 'Subscription start date is required']
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
      index: true
    }
  },
  {
    timestamps: true
  }
);

export const Customer = mongoose.model('Customer', customerSchema);
