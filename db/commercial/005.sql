CREATE TABLE project_removal (
 project_id integer PRIMARY KEY REFERENCES "Project"(id),
 actor_id integer NOT NULL REFERENCES "AppUser"(id),
 project_snapshot jsonb NOT NULL,
 expense_count integer NOT NULL,
 expense_amount numeric NOT NULL,
 removed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE project_removal ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE r text; BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=r) THEN
   EXECUTE format('REVOKE ALL ON project_removal FROM %I',r);
  END IF;
 END LOOP;
END $$;
CREATE FUNCTION reject_removed_project_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id integer; parent_status text;
BEGIN
 IF TG_TABLE_NAME='commercial_document' THEN parent_id=NEW.project_id;
 ELSE parent_id=NEW."projectId"; END IF;
 IF parent_id IS NOT NULL THEN
  SELECT status INTO parent_status FROM "Project" WHERE id=parent_id FOR SHARE;
  IF parent_status='Deleted' THEN RAISE EXCEPTION 'Project has been removed'; END IF;
 END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['Expense','Payment','Labour','Invoice','ExtraWork','ProjectPhoto','commercial_document'] LOOP
  EXECUTE format('CREATE TRIGGER reject_removed_project_write BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION reject_removed_project_write()',t);
 END LOOP;
END $$;
CREATE FUNCTION protect_removed_project() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='Deleted' AND NEW IS DISTINCT FROM OLD THEN
  RAISE EXCEPTION 'Removed project history cannot be changed';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_removed_project BEFORE UPDATE ON "Project"
FOR EACH ROW EXECUTE FUNCTION protect_removed_project();
