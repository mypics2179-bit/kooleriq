# KoolerIQ Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership & Verified Identity**: Every user document (`/users/{userId}`) and all nested store/inventory/order/audit/notification/media/chat subcollections belong strictly to `userId`. All writes require `request.auth != null && request.auth.uid == userId && request.auth.token.email_verified == true`.
2. **PII Isolation (Split Collection Strategy)**: User email is stored solely under `/users/{userId}/private/info` and never exposed on `/users/{userId}` or shared reads.
3. **Master Gate**: Every subcollection under `/users/{userId}/...` verifies parent root document existence (`exists(/databases/$(database)/documents/users/$(userId))`) or atomic creation (`existsAfter(...)` during initial bootstrap batch) and verifies `data.ownerId == request.auth.uid`.
4. **Immutable Ownership & Temporal Integrity**: `ownerId` and `createdAt` cannot be modified after creation (`incoming().ownerId == existing().ownerId`, `incoming().createdAt == existing().createdAt`), and `createdAt`/`updatedAt` must equal `request.time`.
5. **Terminal Order Locking**: Once a distributor purchase order reaches `status == 'received'`, no client update may revert or alter its quantities or status.
6. **Append-Only Audit Ledger**: `/users/{userId}/auditLogs/{entryId}` allows creation and owner reads/deletes, and blocks in-place mutation (`allow update: if false`).
7. **Volumetric Bounds & No Oversized Blobs**: Every string field enforces `.size() <= maxLength` and every array (`doors`, `carriedSkuIds`, `lines`, `tags`, `sources`, `completedSteps`) enforces `.size() <= MAX` to keep documents safely beneath Firestore's 1 MiB cap.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Root Write**: Anonymous write to `/users/userA` without `request.auth`.
2. **Cross-Tenant Read**: `userB` attempts `get` on `/users/userA/stores/store-1`.
3. **Cross-Tenant List Scraping**: `userB` queries `list` on `/users/userA/orders`.
4. **Unverified Email Bypass**: Authenticated user with `email_verified: false` writes to `/users/userA`.
5. **OwnerId Spoofing**: `userA` writes `/users/userA/stores/store-1` with `ownerId: "userB"`.
6. **Shadow Ghost Field Injection**: `userA` creates `/users/userA` including undeclared `"isAdmin": true` or `"creditBalance": 9999`.
7. **Path ID Poisoning**: `userA` creates `/users/userA/stores/invalid$id..with..slashes` violating `^[a-zA-Z0-9_-]+$`.
8. **Client Timestamp Forgery**: `userA` creates `/users/userA/orders/ord-1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time`.
9. **Immutable Owner Mutation**: `userA` updates `/users/userA/stores/store-1` changing `ownerId` or `createdAt`.
10. **Terminal Order Reversal**: `userA` updates `/users/userA/orders/ord-1` when `existing().status == 'received'` back to `status: 'submitted'`.
11. **Audit Log Tampering**: `userA` updates `/users/userA/auditLogs/alog-1` to rewrite `action` or `details`.
12. **Array/String Resource Poisoning**: `userA` writes a `2 MB` base64 string into `mediaAssets.url` or `500` items into `doors` (`> 24` cap).
