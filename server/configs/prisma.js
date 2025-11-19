import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaNeon({ connectionString });

// ✅ For Prisma 6 - NO datasourceUrl
const prisma = global.prisma || new PrismaClient({ 
  adapter
  // Remove datasourceUrl for Prisma 6
});

if (process.env.NODE_ENV === 'development') global.prisma = prisma;

export default prisma;