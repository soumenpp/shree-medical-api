const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create owner user with store
  const hashedPassword = await bcrypt.hash('password123', 12);

  const store = await prisma.store.create({
    data: {
      name: 'SHREE MEDICAL STORE',
      address: 'Main Road, Your City',
      phone: '1234567890',
      email: 'store@example.com',
      gstin: '22AAAAA0000A1Z5',
      ownerId: 'temp'
    }
  });

  const user = await prisma.user.create({
    data: {
      email: 'owner@medicalstore.com',
      password: hashedPassword,
      name: 'Store Owner',
      role: 'OWNER',
      storeId: store.id
    }
  });

  await prisma.store.update({
    where: { id: store.id },
    data: { ownerId: user.id }
  });

  // Create sample medicines
  const medicines = [
    {
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      brand: 'Crocin',
      type: 'TABLET',
      strength: '500mg',
      stripSize: 15,
      pricePerStrip: 30.00,
      pricePerUnit: 2.00,
      description: 'Pain reliever and fever reducer'
    },
    {
      name: 'Amoxicillin',
      genericName: 'Amoxicillin',
      brand: 'Mox',
      type: 'CAPSULE',
      strength: '250mg',
      stripSize: 10,
      pricePerStrip: 60.00,
      pricePerUnit: 6.00,
      description: 'Antibiotic for bacterial infections'
    },
    {
      name: 'Cetirizine',
      genericName: 'Cetirizine Hydrochloride',
      brand: 'Zyrtec',
      type: 'TABLET',
      strength: '10mg',
      stripSize: 10,
      pricePerStrip: 25.00,
      pricePerUnit: 2.50,
      description: 'Antihistamine for allergies'
    },
    {
      name: 'Ibuprofen',
      genericName: 'Ibuprofen',
      brand: 'Brufen',
      type: 'TABLET',
      strength: '400mg',
      stripSize: 10,
      pricePerStrip: 35.00,
      pricePerUnit: 3.50,
      description: 'NSAID for pain and inflammation'
    }
  ];

  for (const med of medicines) {
    const medicine = await prisma.medicine.create({
      data: {
        ...med,
        storeId: store.id,
        qrCode: `QR-${med.name.toUpperCase().replace(/\s/g, '')}-${Date.now()}`
      }
    });

    await prisma.inventory.create({
      data: {
        medicineId: medicine.id,
        stripsInStock: Math.floor(Math.random() * 100) + 20,
        unitsInStock: medicine.stripSize * (Math.floor(Math.random() * 100) + 20),
        minStockLevel: 10,
        batchNumber: `BATCH${Math.floor(Math.random() * 10000)}`,
        expiryDate: new Date(Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000)
      }
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('👤 Login: owner@medicalstore.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });