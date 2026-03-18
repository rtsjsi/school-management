-- Fee types are now hard-coded in the app; drop the unused master table.
DROP TABLE IF EXISTS public.fee_types CASCADE;

