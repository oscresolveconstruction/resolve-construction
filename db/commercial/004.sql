CREATE TABLE financial_request (
 kind text NOT NULL CHECK(kind IN ('expense','payment','labour')),
 request_id uuid NOT NULL,
 actor_id integer NOT NULL REFERENCES "AppUser"(id),
 payload_hash text NOT NULL,
 record_ids jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,request_id)
);
ALTER TABLE financial_request ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON financial_request FROM %I',r);
  END IF;
 END LOOP;
END $$;
-- Keep the customer/currency behind existing approved and issued documents stable.
CREATE FUNCTION protect_project_financial_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW."customerId" IS DISTINCT FROM OLD."customerId" OR NEW.currency IS DISTINCT FROM OLD.currency)
 AND (EXISTS(SELECT 1 FROM commercial_document WHERE project_id=OLD.id)
 OR EXISTS(SELECT 1 FROM "Invoice" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "Payment" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "Expense" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "Labour" WHERE "projectId"=OLD.id)
 OR EXISTS(SELECT 1 FROM "ExtraWork" WHERE "projectId"=OLD.id)) THEN
  RAISE EXCEPTION 'Project customer/currency cannot change after financial records exist';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_project_financial_identity BEFORE UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION protect_project_financial_identity();
