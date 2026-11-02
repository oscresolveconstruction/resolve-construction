-- Costs and unallocated receipts belong to a project, not its current customer.
-- Keep currency stable once financial records exist; keep document identities stable.
CREATE OR REPLACE FUNCTION protect_project_financial_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW."customerId" IS DISTINCT FROM OLD."customerId"
 AND (EXISTS(SELECT 1 FROM commercial_document WHERE project_id=OLD.id)
 OR EXISTS(SELECT 1 FROM "Invoice" WHERE "projectId"=OLD.id)) THEN
  RAISE EXCEPTION 'Project customer cannot change while linked documents exist';
 END IF;
 IF NEW.currency IS DISTINCT FROM OLD.currency
 AND (EXISTS(SELECT 1 FROM commercial_document WHERE project_id=OLD.id)
 OR EXISTS(SELECT 1 FROM "Invoice" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "Payment" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "Expense" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "Labour" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "ExtraWork" WHERE "projectId"=OLD.id)) THEN
  RAISE EXCEPTION 'Project currency cannot change after financial records exist';
 END IF;
 RETURN NEW;
END $$;
