UPDATE "Tenant"
SET "invite_code" = UPPER(SUBSTRING(MD5(RANDOM()::text), 1, 10))
WHERE "invite_code" IS NULL OR "invite_code" = '';

