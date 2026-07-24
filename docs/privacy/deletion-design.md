# Deletion design

1. An authenticated authorized adult creates a deletion request.
2. Re-authenticate the adult and freeze new provider synchronization.
3. Revoke adult and device-bound child sessions before destructive work.
4. Offer a portable export when requested.
5. Cancel or detach optional providers and billing identifiers.
6. Delete evidence objects before their database metadata.
7. Soft-delete during the recoverable review window, then cascade or de-identify family content.
8. Retain only legally required, content-minimized financial/security records.
9. Verify that object storage, queues, caches, analytics, search, and backups follow their
   schedules.
10. Record completion without retaining deleted child content.

Production implementation needs a documented response SLA, legal-hold rules, backup expiry, customer
communication, retry behavior, and an owner-visible failure queue. Database cascades alone are not a
complete deletion system.
