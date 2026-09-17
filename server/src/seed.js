import { Plan } from './models/Plan.js';
import { Owner } from './models/Owner.js';
import { Customer } from './models/Customer.js';
import { PauseRecord } from './models/PauseRecord.js';
import { Bill } from './models/Bill.js';
import { connectDB, disconnectDB } from './config/db.js';

export async function seedInitialData() {
  try {
    const planCount = await Plan.countDocuments();
    let plans = [];

    if (planCount === 0) {
      console.log('[Seed] Seeding sample tiffin plans...');
      plans = await Plan.create([
        {
          name: 'Standard Veg Tiffin (Mon–Fri)',
          price: 2200,
          description: 'Nutritious home-style 4-compartment lunch: 3 chapatis, 1 seasonal sabzi, dal, steamed rice, and salad.'
        },
        {
          name: 'Deluxe Veg Tiffin (Mon–Fri)',
          price: 2800,
          description: 'Special lunch: 4 butter rotis, paneer/special curry, dal tadka, jeera rice, sweet dish, and curd.'
        },
        {
          name: 'Executive Healthy / Low Oil (Mon–Fri)',
          price: 2500,
          description: 'Wholesome multigrain rotis, cold-pressed oil vegetables, sprouts salad, and low-sodium lentils.'
        }
      ]);
      console.log(`[Seed] Created ${plans.length} subscription plans.`);
    } else {
      plans = await Plan.find();
    }

    // Check if an owner exists, else seed demo owner
    const ownerCount = await Owner.countDocuments();
    let demoOwner;
    if (ownerCount === 0) {
      console.log('[Seed] Seeding demo owner account...');
      demoOwner = await Owner.create({
        name: 'Sunita Sharma',
        email: 'owner@tiffin.com',
        password: 'password123',
        businessName: 'Annapurna Home Tiffin'
      });
      console.log('[Seed] Demo owner created (owner@tiffin.com / password123)');
    }

    // Check if sample customers exist, else seed realistic customers to showcase active, paused, and billing
    const customerCount = await Customer.countDocuments();
    if (customerCount === 0 && plans.length > 0) {
      console.log('[Seed] Seeding sample customers and pause records...');
      const plan1 = plans[0]._id;
      const plan2 = plans[1]._id;

      // 1. Active customer full month
      const cust1 = await Customer.create({
        name: 'Rahul Joshi',
        phone: '9876543210',
        address: 'B-304, Green Heights, Tech Park Road',
        planId: plan1,
        subscriptionStartDate: new Date('2026-08-01'),
        status: 'active'
      });

      // 2. Active customer who joined mid-month
      const cust2 = await Customer.create({
        name: 'Pooja Verma',
        phone: '9823456789',
        address: 'Flat 12, Sunrise Residency, Sector 15',
        planId: plan1,
        subscriptionStartDate: new Date('2026-09-14'),
        status: 'active'
      });

      // 3. Paused customer currently on vacation
      const cust3 = await Customer.create({
        name: 'Amit Patel',
        phone: '9812345678',
        address: 'Villa 7, Palm Meadows',
        planId: plan2,
        subscriptionStartDate: new Date('2026-07-01'),
        status: 'paused'
      });

      // Add active pause for Amit Patel
      await PauseRecord.create({
        customerId: cust3._id,
        startDate: new Date('2026-09-15'),
        endDate: new Date('2026-09-22'),
        isResumed: false,
        reason: 'Out of station for family function'
      });

      // 4. Active customer with a completed pause earlier this month
      const cust4 = await Customer.create({
        name: 'Sneha Rao',
        phone: '9890123456',
        address: 'Tower 4, 1102, Skyline Towers',
        planId: plan1,
        subscriptionStartDate: new Date('2026-06-01'),
        status: 'active'
      });

      // Completed pause for Sneha
      await PauseRecord.create({
        customerId: cust4._id,
        startDate: new Date('2026-09-07'),
        endDate: new Date('2026-09-11'),
        isResumed: true,
        resumedAt: new Date('2026-09-11'),
        reason: 'Short trip'
      });

      // 5. Paused customer indefinitely
      const cust5 = await Customer.create({
        name: 'Vikram Mehta',
        phone: '9834567890',
        address: 'C-501, Silver Crest Apartments',
        planId: plan2,
        subscriptionStartDate: new Date('2026-05-15'),
        status: 'paused'
      });

      await PauseRecord.create({
        customerId: cust5._id,
        startDate: new Date('2026-09-18'),
        endDate: null,
        isResumed: false,
        reason: 'Work from home / medical rest'
      });

      console.log('[Seed] Sample customers and pause records seeded successfully.');
    }
  } catch (err) {
    console.error('[Seed Error]:', err);
  }
}

// Allow running seed standalone: node src/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    await connectDB();
    await seedInitialData();
    await disconnectDB();
    process.exit(0);
  })();
}
