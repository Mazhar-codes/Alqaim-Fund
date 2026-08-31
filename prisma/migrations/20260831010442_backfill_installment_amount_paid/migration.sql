-- Data fix: backfill amountPaid for installments marked PAID before this
-- field existed. The ledger's INSTALLMENT_PAYMENT transaction for each
-- installment already holds the real amount received (and was corrected
-- for any known bad rows), so it's the source of truth here.
UPDATE "installments" i
SET "amountPaid" = t."amount"
FROM "transactions" t
WHERE t."referenceType" = 'installment'
  AND t."referenceId" = i.id
  AND t."category" = 'INSTALLMENT_PAYMENT'
  AND i."status" = 'PAID'
  AND i."amountPaid" IS NULL;
