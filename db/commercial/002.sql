CREATE TABLE commercial_trash (
 kind text NOT NULL CHECK (kind IN ('document','invoice')),
 record_id integer NOT NULL,
 deleted_by integer NOT NULL REFERENCES "AppUser"(id),
 deleted_at timestamptz NOT NULL DEFAULT now(),
 reason text NOT NULL,
 PRIMARY KEY(kind,record_id)
);
ALTER TABLE commercial_trash ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON commercial_trash FROM %I',r);
  END IF;
 END LOOP;
END $$;
