// configs/prisma.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

// Prisma 7+ configuration
const prisma = global.prisma || new PrismaClient({ 
  adapter,
  datasourceUrl: connectionString
});

if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

export default prisma;