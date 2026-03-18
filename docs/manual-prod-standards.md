## Prod/Dev Standards Load (Single Command)

When setting up **fresh data** on any environment (dev or prod), load Standards with:

```bash
node scripts/by-branch.js db query --linked -f supabase/manual/insert_standards_prod.sql -o table
```

This inserts, in order:

1. Nursery – pre_primary  
2. Junior KG (LKG) – pre_primary  
3. Senior KG (UKG) – pre_primary  
4. I – primary  
5. II – primary  
6. III – primary  
7. IV – primary  
8. V – primary  
9. VI – primary  
10. VII – primary  
11. VIII – primary  
12. IX – secondary  
13. X – secondary  
14. XI – higher_secondary  
15. XII – higher_secondary  

Notes:
- This script assumes the `public.standards` table is either **empty or flushed** before running.  
- There is **no extra Roman-name migration step**; all standards are inserted directly with final Roman names.

