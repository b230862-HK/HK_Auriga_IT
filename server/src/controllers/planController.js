import { Plan } from '../models/Plan.js';

export async function getPlans(req, res, next) {
  try {
    const plans = await Plan.find().sort({ price: 1 });
    res.json({
      success: true,
      plans
    });
  } catch (err) {
    next(err);
  }
}

export async function createPlan(req, res, next) {
  try {
    const { name, price, description } = req.body;

    if (!name || price === undefined || price === null) {
      return res.status(400).json({
        success: false,
        error: 'Plan name and price are required.'
      });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({
        success: false,
        error: 'Plan price must be a valid non-negative number.'
      });
    }

    const plan = new Plan({
      name: name.trim(),
      price: numPrice,
      description: description ? description.trim() : ''
    });

    await plan.save();

    res.status(201).json({
      success: true,
      plan
    });
  } catch (err) {
    next(err);
  }
}
