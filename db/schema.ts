import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const state=sqliteTable('site_state',{id:integer('id').primaryKey(),draft:text('draft').notNull(),published:text('published').notNull(),version:integer('version').notNull().default(0)});
export const revisions=sqliteTable('revisions',{id:text('id').primaryKey(),document:text('document').notNull(),created:text('created').notNull(),actor:text('actor').notNull(),kind:text('kind').notNull()});
export const media=sqliteTable('media',{id:text('id').primaryKey(),name:text('name').notNull(),mime:text('mime').notNull(),size:integer('size').notNull(),deleted:integer('deleted').notNull().default(0),created:text('created').notNull()});
export const sessions=sqliteTable('admin_sessions',{id:text('id').primaryKey(),expires:integer('expires').notNull()});
export const attempts=sqliteTable('login_attempts',{id:text('id').primaryKey(),count:integer('count').notNull(),window:integer('window').notNull()});
