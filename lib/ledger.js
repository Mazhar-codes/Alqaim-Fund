/**
 * Appends one row to the member's IN/OUT transaction ledger and maintains a
 * running balanceAfter (net rupees the member has paid into the fund so far:
 * + for money paid OUT of their pocket, - for loan money paid IN to them).
 *
 * Always call this with the same `tx` (a Prisma interactive-transaction
 * client) used for the surrounding write, so the ledger entry can never end
 * up out of sync with the payment/loan record that caused it.
 */
export async function appendTransaction(
  tx,
  { userId, direction, category, amount, referenceType, referenceId, description }
) {
  const last = await tx.transaction.findFirst({
    where: { userId },
    orderBy: { id: "desc" },
    select: { balanceAfter: true },
  });

  const previousBalance = last ? Number(last.balanceAfter) : 0;
  const delta = direction === "OUT" ? Number(amount) : -Number(amount);
  const balanceAfter = Math.round((previousBalance + delta) * 100) / 100;

  return tx.transaction.create({
    data: {
      userId,
      direction,
      category,
      amount,
      balanceAfter,
      referenceType,
      referenceId,
      description,
    },
  });
}
