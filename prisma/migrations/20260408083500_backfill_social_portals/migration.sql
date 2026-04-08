UPDATE "User"
SET "accessGrants" = (
  SELECT COALESCE(array_agg(DISTINCT portal), ARRAY[]::"UserPortal"[])
  FROM unnest(
    COALESCE("accessGrants", ARRAY[]::"UserPortal"[]) ||
    ARRAY['MESSAGES'::"UserPortal", 'GROUPS'::"UserPortal", 'CONNECTIONS'::"UserPortal"]
  ) AS portal
)
WHERE "role" IN ('STUDENT', 'ADMIN');

UPDATE "User"
SET "accessGrants" = (
  SELECT COALESCE(array_agg(DISTINCT portal), ARRAY[]::"UserPortal"[])
  FROM unnest(
    COALESCE("accessGrants", ARRAY[]::"UserPortal"[]) ||
    ARRAY['MESSAGES'::"UserPortal"]
  ) AS portal
)
WHERE "role" = 'MENTOR';
