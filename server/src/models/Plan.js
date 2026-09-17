import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Plan price is required'],
      min: [0, 'Plan price cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

export const Plan = mongoose.model('Plan', planSchema);
