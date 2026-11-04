# Decisions

The product requirements in [BRIEF.md](./BRIEF.md) are the source of truth. The
approved architecture amendments in the current build prompt apply alongside
that scope.

| Topic | Decision |
| --- | --- |
| Recall grading | Self-graded with a timer; timeout is red. |
| Explain pass mark | 70%. |
| Palace flags | A flag may reference a stable topic key-point ID or remain a free note. |
| Product name | Pinpoint. |
| Key-point IDs | Store key points in `topics.key_points_json`; allocate IDs from a monotonically increasing per-topic counter so removed IDs are never reused. |
| Upload status | Keep transient processing state in BullMQ/Redis, not in PostgreSQL. |
| Ownership | Scope direct resource lookups by `user_id`; for child rows, constrain through their user-owned parent in the same query. |
| Local ports | Preserve occupied legacy/default listeners and expose the new stack on API 4100, web 5180, PostgreSQL 5433, and Redis 6380. |
| Legacy app | Keep the existing `client/` and `server/` trees intact during the staged migration; the new implementation lives in `apps/web`, `apps/api`, and `packages/shared`. |
