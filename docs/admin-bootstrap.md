# Administrator bootstrap

Only a trusted database administrator may assign the initial administrator. First create the intended user through normal authentication and verify their UUID in `auth.users`. Then connect using a trusted SQL console and run the following transaction with the verified UUID:

```sql
begin;
insert into private.user_roles (user_id, role, granted_by)
values ('<verified-auth-user-uuid>'::uuid, 'admin', null)
on conflict (user_id) do update set role = excluded.role;
insert into private.moderation_events (actor_id, action, target_type, target_id)
values (null, 'grant_admin', 'user', '<verified-auth-user-uuid>'::uuid);
commit;
```

Keep the administrator count to one until the product has an approved delegation workflow. Never bootstrap from a browser, editable profile, or user metadata. Privileged functions must verify the caller's JWT and query this private table for each mutation. Review audit events after every role change.
