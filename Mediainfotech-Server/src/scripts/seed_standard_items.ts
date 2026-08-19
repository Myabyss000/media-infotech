import { prisma } from '../lib/prisma';
import { PRESET_DEVICE_CATALOG } from '../controllers/inventory.controller';
import { InventoryCondition, InventoryStatus, InventoryLogAction } from '@prisma/client';

async function main() {
  console.log(`Seeding ${PRESET_DEVICE_CATALOG.length} company preset equipment devices...`);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < PRESET_DEVICE_CATALOG.length; i++) {
    const preset = PRESET_DEVICE_CATALOG[i];
    const existing = await prisma.inventoryItem.findFirst({
      where: { deviceName: preset.deviceName },
    });

    if (!existing) {
      const cleanNamePart = preset.deviceName
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase();
      const barcode = `MIT-${cleanNamePart}-${String(i + 1).padStart(3, '0')}`;

      await prisma.inventoryItem.create({
        data: {
          deviceName: preset.deviceName,
          barcode,
          category: preset.category,
          condition: preset.defaultCondition as InventoryCondition,
          status: InventoryStatus.IN_STOCK,
          unitPrice: preset.unitPrice,
          stockAmount: 5,
          location: 'HQ Central Store, Rack A-1',
          supplier: 'Media Infotech Master Stock',
          logs: {
            create: {
              action: InventoryLogAction.CHECK_IN,
              notes: 'Master company preset catalog seed',
            },
          },
        },
      });
      created++;
    } else {
      skipped++;
    }
  }

  console.log(`✅ Finished seeding! Created: ${created}, Already existed: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
