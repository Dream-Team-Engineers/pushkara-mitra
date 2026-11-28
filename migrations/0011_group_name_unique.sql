-- Group names are unique among active groups, ignoring upper and lower case (owner request 2026-11-28).
-- The route checks first and answers NAME_TAKEN; this index is the backstop if two people pick the
-- same name at once. A closed group frees its name. No personal data is added.
CREATE UNIQUE INDEX group_name_unique ON group_ (lower(name)) WHERE name IS NOT NULL AND state = 'active';
