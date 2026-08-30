const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PLANS = [
  { code: "A", name: "Plan A", monthlyAmount: 2000, tenureMonths: 12, maxLoanMultiplier: 20 },
  { code: "B", name: "Plan B", monthlyAmount: 3000, tenureMonths: 12, maxLoanMultiplier: 20 },
  { code: "C", name: "Plan C", monthlyAmount: 5000, tenureMonths: 12, maxLoanMultiplier: 20 },
];

async function main() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({ where: { code: plan.code }, update: plan, create: plan });
  }

  await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, defaultTenureMonths: 12, minInstallmentsForLoan: 3, smsEnabled: false },
  });

  console.log("Seeded plans A/B/C and default settings.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
