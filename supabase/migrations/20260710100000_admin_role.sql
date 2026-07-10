-- Step 1: add enum value (must commit before functions can reference 'admin').

alter type membership_role add value if not exists 'admin' after 'owner';
