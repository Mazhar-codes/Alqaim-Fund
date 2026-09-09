/** Approved donations in, minus recorded expenses out — what's actually left to spend. */
export async function getDonationBalance(prisma) {
  const [donationAgg, expenseAgg] = await Promise.all([
    prisma.donation.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
    prisma.donationExpense.aggregate({ _sum: { amount: true } }),
  ]);
  const totalDonations = Number(donationAgg._sum.amount || 0);
  const totalSpent = Number(expenseAgg._sum.amount || 0);
  return { totalDonations, totalSpent, available: totalDonations - totalSpent };
}
