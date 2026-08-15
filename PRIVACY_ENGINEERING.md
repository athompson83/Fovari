# Privacy engineering

Fovari is designed around a private household rather than a child social network. Release 1 has no
advertising, public profiles, stranger contact, precise location, open-ended child AI, external
commerce, or production analytics.

The local build uses synthetic data. Connected mode must collect only the identity, goal,
completion, reward, consent, device-session, and audit fields required to operate the family loop.
Free-form notes are bounded. Evidence is optional, private, MIME/size restricted, and subject to a
documented retention schedule.

An authenticated adult must be able to request access, export, correction, and deletion. Deletion is
an orchestrated process: revoke sessions first, stop processing, export if requested, delete or
de-identify dependent data according to legal retention requirements, verify completion, and keep
only a minimal non-content audit record when legally justified.

These controls are engineering readiness, not a claim of COPPA, FERPA, GDPR, state-law, or
store-policy compliance. Counsel and privacy review remain release gates.
