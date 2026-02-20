import { pgTable, serial, text, timestamp, uuid, bigint, jsonb, integer, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1) Users of your app (mapped from Clerk)
export const appUser = pgTable('app_user', {
    id: serial('id').primaryKey(),
    // e.g. "user_2lV..."; comes from Clerk
    externalId: text('external_id').notNull().unique(),
    email: text('email'),
    name: text('name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Uploaded documents (persisted so users can resume later)
export const documentUpload = pgTable('document_upload', {
    id: text('id').primaryKey(), // using stored filename as id
    userId: bigint('user_id', { mode: 'number' })
        .notNull()
        .references(() => appUser.id, { onDelete: 'cascade' }),
    originalName: text('original_name').notNull(),
    storedAs: text('stored_as').notNull(),
    storageProvider: text('storage_provider').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type'),
    size: bigint('size', { mode: 'number' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
    check(
        'document_upload_storage_provider_check',
        sql`${table.storageProvider} in ('s3', 'local')`
    ),
]);

// 2) A chat session ("thread")
export const conversation = pgTable('conversation', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: bigint('user_id', { mode: 'number' })
        .notNull()
        .references(() => appUser.id, { onDelete: 'cascade' }),
    title: text('title'), // e.g. "Chat about UC Berkeley SOP.pdf"
    sourcePdfName: text('source_pdf_name'), // optional
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata'), // optional (tags, etc.)
});

// 3) Individual chat messages
export const message = pgTable('message', {
    id: serial('id').primaryKey(),
    conversationId: uuid('conversation_id')
        .notNull()
        .references(() => conversation.id, { onDelete: 'cascade' }),
    role: text('role').notNull(), // CHECK constraint is handled via application logic or raw SQL if strictly needed in Drizzle
    content: text('content').notNull(), // full message text
    // optional extra fields
    modelName: text('model_name'), // e.g. "gemini-2.5-pro"
    tokenCount: integer('token_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
