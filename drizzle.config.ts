import { defineConfig } from 'drizzle-kit';

const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

export default defineConfig({
    schema: './lib/db/schema.ts',
    out: './drizzle',
    dialect: DATABASE_URL.startsWith('postgres') ? 'postgresql' : 'sqlite',
    dbCredentials: DATABASE_URL.startsWith('postgres')
        ? { url: DATABASE_URL }
        : { url: DATABASE_URL.replace('file:', '') },
});
