-- Rename demo org slug (remove "pilot" from URLs)
update organizations
set slug = 'eri-plaza'
where slug = 'pilot-plaza';
