DELETE FROM form_target_roles
WHERE ctid NOT IN (
  SELECT MIN(ctid)
  FROM form_target_roles
  GROUP BY form_id, role
);
--> statement-breakpoint
ALTER TABLE "form_target_roles"
  ADD CONSTRAINT "form_target_roles_form_id_role_pk" PRIMARY KEY ("form_id", "role");
