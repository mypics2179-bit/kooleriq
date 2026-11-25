import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import {
  chatMessages,
  storeWorkspaces,
  subscriptions,
  users,
} from './schema.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string | null) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          displayName: displayName ?? null,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed (getOrCreateUser):', error);
    throw new Error('Failed to synchronize user profile.', { cause: error });
  }
}

export async function getWorkspaceForUser(userId: number) {
  try {
    const rows = await db
      .select()
      .from(storeWorkspaces)
      .where(eq(storeWorkspaces.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed (getWorkspaceForUser):', error);
    throw new Error('Failed to load cooler workspace.', { cause: error });
  }
}

export async function upsertWorkspaceForUser(
  userId: number,
  payload: {
    storeName: string;
    storeCode: string;
    doorsJson: unknown;
    catalogJson: unknown;
    insightsJson: unknown;
    auditsJson: unknown;
    settingsJson: unknown;
    storesJson?: unknown;
  }
) {
  try {
    const rows = await db
      .insert(storeWorkspaces)
      .values({
        userId,
        storeName: payload.storeName,
        storeCode: payload.storeCode,
        doorsJson: payload.doorsJson,
        catalogJson: payload.catalogJson,
        insightsJson: payload.insightsJson,
        auditsJson: payload.auditsJson,
        settingsJson: payload.settingsJson,
        storesJson: payload.storesJson ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storeWorkspaces.userId,
        set: {
          storeName: payload.storeName,
          storeCode: payload.storeCode,
          doorsJson: payload.doorsJson,
          catalogJson: payload.catalogJson,
          insightsJson: payload.insightsJson,
          auditsJson: payload.auditsJson,
          settingsJson: payload.settingsJson,
          storesJson: payload.storesJson ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed (upsertWorkspaceForUser):', error);
    throw new Error('Failed to save cooler workspace.', { cause: error });
  }
}

export async function getSubscriptionForUser(userId: number) {
  try {
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed (getSubscriptionForUser):', error);
    throw new Error('Failed to load subscription.', { cause: error });
  }
}

export async function upsertSubscriptionForUser(
  userId: number,
  payload: {
    planTier: string;
    billingCycle: string;
    doorQuota: number;
    storeCount: number;
    googlePlayLinked: boolean;
  }
) {
  try {
    const rows = await db
      .insert(subscriptions)
      .values({
        userId,
        planTier: payload.planTier,
        billingCycle: payload.billingCycle,
        doorQuota: payload.doorQuota,
        storeCount: payload.storeCount,
        googlePlayLinked: payload.googlePlayLinked,
        status: 'active',
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          planTier: payload.planTier,
          billingCycle: payload.billingCycle,
          doorQuota: payload.doorQuota,
          storeCount: payload.storeCount,
          googlePlayLinked: payload.googlePlayLinked,
          status: 'active',
          updatedAt: new Date(),
        },
      })
      .returning();
    return rows[0];
  } catch (error) {
    console.error('Database query failed (upsertSubscriptionForUser):', error);
    throw new Error('Failed to update subscription plan.', { cause: error });
  }
}

export async function getChatHistoryForUser(userId: number) {
  try {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(chatMessages.id)
      .limit(50);
  } catch (error) {
    console.error('Database query failed (getChatHistoryForUser):', error);
    throw new Error('Failed to load chat history.', { cause: error });
  }
}

export async function appendChatMessagesForUser(
  userId: number,
  messages: Array<{
    role: string;
    modelUsed: string;
    content: string;
    sourcesJson?: unknown;
  }>
) {
  try {
    if (messages.length === 0) return [];
    return await db
      .insert(chatMessages)
      .values(
        messages.map((m) => ({
          userId,
          role: m.role,
          modelUsed: m.modelUsed,
          content: m.content,
          sourcesJson: m.sourcesJson ?? null,
        }))
      )
      .returning();
  } catch (error) {
    console.error('Database query failed (appendChatMessagesForUser):', error);
    throw new Error('Failed to persist chat messages.', { cause: error });
  }
}

export async function clearChatHistoryForUser(userId: number) {
  try {
    await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  } catch (error) {
    console.error('Database query failed (clearChatHistoryForUser):', error);
    throw new Error('Failed to clear chat history.', { cause: error });
  }
}
