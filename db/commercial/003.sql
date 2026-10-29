CREATE TABLE commercial_invoice_void (
 invoice_id integer PRIMARY KEY REFERENCES "Invoice"(id),
 actor_id integer NOT NULL REFERENCES "AppUser"(id),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commercial_invoice_void ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON commercial_invoice_void FROM %I',r);
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION protect_invoice_void() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Invoice cancellation history is immutable'; END $$;
CREATE TRIGGER protect_invoice_void BEFORE UPDATE OR DELETE ON commercial_invoice_void
FOR EACH ROW EXECUTE FUNCTION protect_invoice_void();
CREATE OR REPLACE FUNCTION protect_commercial_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.status<>'Void' AND NEW.status='Void'
 AND EXISTS(SELECT 1 FROM commercial_invoice_void WHERE invoice_id=OLD.id)
 AND (to_jsonb(NEW)-'status'-'updatedAt')=(to_jsonb(OLD)-'status'-'updatedAt') THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.status='Void' THEN RAISE EXCEPTION 'Use recorded invoice cancellation'; END IF;
 IF OLD.status='Void' OR EXISTS(SELECT 1 FROM commercial_invoice WHERE invoice_id=OLD.id)
 OR EXISTS(SELECT 1 FROM commercial_invoice_void WHERE invoice_id=OLD.id) THEN
  RAISE EXCEPTION 'Issued or cancelled invoices are immutable';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION reject_void_invoice_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invoice_status text;
BEGIN
 IF NEW."invoiceId" IS NULL THEN RETURN NEW; END IF;
 SELECT status INTO invoice_status FROM "Invoice" WHERE id=NEW."invoiceId" FOR UPDATE;
 IF invoice_status='Void' THEN RAISE EXCEPTION 'Cannot pay a cancelled invoice'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reject_void_invoice_payment BEFORE INSERT OR UPDATE ON "Payment"
FOR EACH ROW EXECUTE FUNCTION reject_void_invoice_payment();
