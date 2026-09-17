import { Plan } from './models/Plan.js';
import { Owner } from './models/Owner.js';
import { Customer } from './models/Customer.js';
import { Subscription } from './models/Subscription.js';
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

    // Demo owner account
    const ownerCount = await Owner.countDocuments();
    if (ownerCount === 0) {
      console.log('[Seed] Seeding demo owner account...');
      await Owner.create({
        name: 'Sunita Sharma',
        email: 'owner@tiffin.com',
        password: 'password123',
        businessName: 'Annapurna Home Tiffin'
      });
      console.log('[Seed] Demo owner created (owner@tiffin.com / password123)');
    }

    // Seed sample customers & subscriptions
    const subCount = await Subscription.countDocuments();
    if (subCount === 0 && plans.length > 0) {
      console.log('[Seed] Seeding sample customers, subscriptions, and pause records...');
      const plan1 = plans[0]._id;
      const plan2 = plans[1]._id;

      // 1. Active customer full month
      const cust1 = await Customer.create({
        name: 'Rahul Joshi',
        phone: '9876543210',
        address: 'B-304, Green Heights, Tech Park Road'
      });
      await Subscription.create({
        planId: plan1,
        cycleStartDate: new Date('2026-08-01'),
        status: 'active',
        currentCustomerId: cust1._id,
        ownershipHistory: [{ customerId: cust1._id, from: new Date('2026-08-01'), to: null }]
      });

      // 2. Active customer who joined mid-month
      const cust2 = await Customer.create({
        name: 'Pooja Verma',
        phone: '9823456789',
        address: 'Flat 12, Sunrise Residency, Sector 15'
      });
      await Subscription.create({
        planId: plan1,
        cycleStartDate: new Date('2026-09-14'),
        status: 'active',
        currentCustomerId: cust2._id,
        ownershipHistory: [{ customerId: cust2._id, from: new Date('2026-09-14'), to: null }]
      });

      // 3. Paused customer currently on vacation
      const cust3 = await Customer.create({
        name: 'Amit Patel',
        phone: '9812345678',
        address: 'Villa 7, Palm Meadows'
      });
      const sub3 = await Subscription.create({
        planId: plan2,
        cycleStartDate: new Date('2026-07-01'),
        status: 'paused',
        currentCustomerId: cust3._id,
        ownershipHistory: [{ customerId: cust3._id, from: new Date('2026-07-01'), to: null }]
      });
      await PauseRecord.create({
        subscriptionId: sub3._id,
        startDate: new Date('2026-09-15'),
        endDate: new Date('2026-09-22'),
        isResumed: false,
        reason: 'Out of station for family function'
      });

      // 4. Active customer with a completed pause earlier this month
      const cust4 = await Customer.create({
        name: 'Sneha Rao',
        phone: '9890123456',
        address: 'Tower 4, 1102, Skyline Towers'
      });
      const sub4 = await Subscription.create({
        planId: plan1,
        cycleStartDate: new Date('2026-06-01'),
        status: 'active',
        currentCustomerId: cust4._id,
        ownershipHistory: [{ customerId: cust4._id, from: new Date('2026-06-01'), to: null }]
      });
      await PauseRecord.create({
        subscriptionId: sub4._id,
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
        address: 'C-501, Silver Crest Apartments'
      });
      const sub5 = await Subscription.create({
        planId: plan2,
        cycleStartDate: new Date('2026-05-15'),
        status: 'paused',
        currentCustomerId: cust5._id,
        ownershipHistory: [{ customerId: cust5._id, from: new Date('2026-05-15'), to: null }]
      });
      await PauseRecord.create({
        subscriptionId: sub5._id,
        startDate: new Date('2026-09-18'),
        endDate: null,
        isResumed: false,
        reason: 'Work from home / medical rest'
      });

      // 6. Transferred subscription (demonstrating T6 mid-cycle transfer)
      const custOutgoing = await Customer.create({
        name: 'Ananya Gupta',
        phone: '9855512345',
        address: 'Sector 4, Flat 101'
      });
      const custIncoming = await Customer.create({
        name: 'Karan Singh',
        phone: '9866654321',
        address: 'Sector 4, Flat 101 (Relocated Colleague)'
      });
      await Subscription.create({
        planId: plan1,
        cycleStartDate: new Date('2026-08-01'),
        status: 'active',
        currentCustomerId: custIncoming._id,
        ownershipHistory: [
          { customerId: custOutgoing._id, from: new Date('2026-08-01'), to: new Date('2026-09-15') },
          { customerId: custIncoming._id, from: new Date('2026-09-16'), to: null }
        ]
      });

      console.log('[Seed] Sample subscriptions and transferred records seeded successfully.');
    }
  } catch (err) {
    console.error('[Seed Error]:', err);
  }
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  (async () => {
    await connectDB();
    await seedInitialData();
    await disconnectDB();
    process.exit(0);
  })();
}
