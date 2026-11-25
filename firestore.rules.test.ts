/**
 * Phase 0 TDD Specification Tests for KoolerIQ Firestore Rules.
 * Designed for @firebase/rules-unit-testing against the Dirty Dozen payloads.
 */
export interface DirtyDozenScenario {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: DirtyDozenScenario[] = [
  {
    id: 1,
    name: 'Unauthenticated root write',
    actorUid: null,
    emailVerified: false,
    operation: 'create',
    path: '/users/userA',
    payload: { ownerId: 'userA', displayName: 'Anon' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-tenant store read',
    actorUid: 'userB',
    emailVerified: true,
    operation: 'get',
    path: '/users/userA/stores/store-1',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-tenant orders list scrape',
    actorUid: 'userB',
    emailVerified: true,
    operation: 'list',
    path: '/users/userA/orders',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified email write attempt',
    actorUid: 'userA',
    emailVerified: false,
    operation: 'create',
    path: '/users/userA',
    payload: { ownerId: 'userA', displayName: 'Unverified' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'OwnerId spoofing on store create',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/users/userA/stores/store-1',
    payload: { ownerId: 'userB', storeId: 'store-1', storeName: 'Hijacked' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Shadow ghost field privilege injection',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/users/userA',
    payload: { ownerId: 'userA', displayName: 'Bob', isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Malformed path ID poisoning',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/users/userA/stores/bad$id!',
    payload: { ownerId: 'userA', storeId: 'bad$id!' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client-forged createdAt timestamp',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/users/userA/orders/ord-1',
    payload: { ownerId: 'userA', poNumber: 'PO-1', createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable ownerId mutation on update',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'update',
    path: '/users/userA/stores/store-1',
    payload: { ownerId: 'userB' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal received order status reversal',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'update',
    path: '/users/userA/orders/ord-1',
    payload: { status: 'submitted' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Append-only audit log tampering',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'update',
    path: '/users/userA/auditLogs/alog-1',
    payload: { action: 'Tampered action' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Oversized media URL payload (>120KB)',
    actorUid: 'userA',
    emailVerified: true,
    operation: 'create',
    path: '/users/userA/mediaAssets/asset-1',
    payload: { ownerId: 'userA', url: 'x'.repeat(250000) },
    expected: 'PERMISSION_DENIED',
  },
];
