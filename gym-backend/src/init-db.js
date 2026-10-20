import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDatabase() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT) || 3306;
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'gym_community';

  console.log(`Connecting to MySQL server at ${dbHost}:${dbPort}...`);

  // Connect without a specific database selected
  const connection = await mysql.createConnection({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    multipleStatements: true,
    dateStrings: true,
    decimalNumbers: true
  });

  try {
    console.log(`Ensuring database "${dbName}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`USE \`${dbName}\``);

    console.log('Running schema.sql...');
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    await connection.query(schemaSql);
    console.log('Schema created successfully.');

    console.log('Seeding default fitness groups...');
    const defaultGroups = [
      {
        name: 'Fat Loss',
        goal: 'Weight Loss & Caloric Deficit',
        description: 'Support and tracking for healthy, consistent fat loss.'
      },
      {
        name: 'Muscle Gain',
        goal: 'Hypertrophy & Mass',
        description: 'Workouts, nutrition, and progression for building lean muscle.'
      },
      {
        name: 'Powerlifting',
        goal: 'Max Strength in Big Three',
        description: 'Dedicated to Squat, Bench Press, and Deadlift power.'
      },
      {
        name: 'Running',
        goal: 'Endurance & Cardio',
        description: 'Distance milestones, 5K, 10K, half-marathons, and pace work.'
      },
      {
        name: 'Calisthenics',
        goal: 'Bodyweight Mastery',
        description: 'Pull-ups, dips, push-ups, muscle-ups, and lever progression.'
      }
    ];

    for (const group of defaultGroups) {
      await connection.query(
        'INSERT IGNORE INTO fitness_groups (name, goal, description, created_by) VALUES (?, ?, ?, NULL)',
        [group.name, group.goal, group.description]
      );
    }
    console.log(`Seeded ${defaultGroups.length} default groups.`);
    console.log('Database initialization completed successfully.');
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();
