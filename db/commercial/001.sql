-- Additive migration. Existing invoices, payments and extra works are retained.
CREATE TABLE IF NOT EXISTS commercial_document (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL CHECK (kind IN ('quote','extra')),
 number text NOT NULL UNIQUE,
 customer_id integer NOT NULL REFERENCES "Customer"(id) ON DELETE RESTRICT,
 project_id integer REFERENCES "Project"(id) ON DELETE RESTRICT,
 extra_work_id integer UNIQUE REFERENCES "ExtraWork"(id) ON DELETE RESTRICT,
 status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Approved','Rejected','Expired')),
 revision integer NOT NULL DEFAULT 1,
 historical_reviewed boolean NOT NULL DEFAULT true,
 previous_billed_minor bigint NOT NULL DEFAULT 0 CHECK (previous_billed_minor >= 0),
 previous_id integer REFERENCES commercial_document(id),
 title text NOT NULL,
 currency text NOT NULL CHECK (currency IN ('GBP','EUR')),
 issue_date date NOT NULL,
 valid_until date,
 items jsonb NOT NULL,
 total_minor bigint NOT NULL CHECK (total_minor > 0),
 customer_snapshot jsonb NOT NULL,
 issuer_snapshot jsonb NOT NULL,
 terms text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 approved_by text,
 approved_at timestamptz,
 approval_evidence text,
 created_by integer NOT NULL REFERENCES "AppUser"(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK (kind <> 'extra' OR project_id IS NOT NULL),
 CHECK (valid_until IS NULL OR valid_until >= issue_date)
);
CREATE SEQUENCE IF NOT EXISTS commercial_quote_number;
CREATE SEQUENCE IF NOT EXISTS commercial_extra_number;
CREATE SEQUENCE IF NOT EXISTS commercial_invoice_number;
CREATE TABLE IF NOT EXISTS commercial_invoice (
 invoice_id integer PRIMARY KEY REFERENCES "Invoice"(id) ON DELETE RESTRICT,
 source_id integer NOT NULL REFERENCES commercial_document(id) ON DELETE RESTRICT,
 amount_minor bigint NOT NULL CHECK (amount_minor > 0),
 request_id uuid NOT NULL UNIQUE,
 description text NOT NULL,
 customer_snapshot jsonb NOT NULL,
 issuer_snapshot jsonb NOT NULL,
 terms text NOT NULL,
 created_by integer NOT NULL REFERENCES "AppUser"(id),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS commercial_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 document_id integer NOT NULL REFERENCES commercial_document(id),
 actor_id integer NOT NULL REFERENCES "AppUser"(id),
 event text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commercial_invoice_source_idx ON commercial_invoice(source_id);
-- Persisted billing allocations must never be bypassed via legacy edit/delete forms.
CREATE OR REPLACE FUNCTION protect_commercial_invoice() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM commercial_invoice WHERE invoice_id=OLD.id) THEN
  RAISE EXCEPTION 'Source-linked invoices are immutable; retain the issued document';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_commercial_invoice BEFORE UPDATE OR DELETE ON "Invoice"
FOR EACH ROW EXECUTE FUNCTION protect_commercial_invoice();
CREATE OR REPLACE FUNCTION protect_commercial_extra() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM commercial_document WHERE extra_work_id=OLD.id AND status='Approved') THEN
  RAISE EXCEPTION 'Approved additional works are immutable';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_commercial_extra BEFORE UPDATE OR DELETE ON "ExtraWork"
FOR EACH ROW EXECUTE FUNCTION protect_commercial_extra();
-- Lock the parent invoice so simultaneous payments cannot overpay it.
CREATE OR REPLACE FUNCTION validate_commercial_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE invoice_row "Invoice"%ROWTYPE; paid numeric;
BEGIN
 IF NEW."invoiceId" IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO invoice_row FROM "Invoice" WHERE id=NEW."invoiceId" FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;
 IF NEW.currency <> invoice_row.currency OR NEW."projectId" <> invoice_row."projectId" THEN
  RAISE EXCEPTION 'Payment project and currency must match invoice';
 END IF;
 IF NEW.amount <= 0 THEN RAISE EXCEPTION 'Payment must be positive'; END IF;
 SELECT COALESCE(sum(amount),0) INTO paid FROM "Payment" WHERE "invoiceId"=NEW."invoiceId" AND id<>NEW.id;
 IF paid + NEW.amount > invoice_row.amount THEN RAISE EXCEPTION 'Payment exceeds invoice balance'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_commercial_payment BEFORE INSERT OR UPDATE ON "Payment"
FOR EACH ROW EXECUTE FUNCTION validate_commercial_payment();
