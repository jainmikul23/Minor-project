const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function initFakeDb() {
  if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
    console.error("🛑 Refusing to run init_fake_db in production or when DATABASE_URL is set!");
    process.exit(1);
  }

  console.log('Connecting to MySQL host:', process.env.DB_HOST);
  console.log('Target database: MinorDBFake (preserving MinorDB unchanged)');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    multipleStatements: true
  });

  try {
    // Ensure MinorDBFake database exists
    await connection.query('CREATE DATABASE IF NOT EXISTS MinorDBFake CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');
    await connection.query('USE MinorDBFake;');
    console.log('✅ Using MinorDBFake database');

    // Create tables without restrictive foreign keys to other portals
    const createTablesSQL = `
      -- 1. User table
      CREATE TABLE IF NOT EXISTS \`User\` (
        \`user_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`First_name\` VARCHAR(40) NOT NULL,
        \`Last_name\` VARCHAR(40) NOT NULL,
        \`Email\` VARCHAR(100) NOT NULL,
        \`Phone\` VARCHAR(15) NOT NULL,
        \`Password_hash\` VARCHAR(255) NOT NULL,
        \`Pincode\` VARCHAR(10) DEFAULT NULL,
        \`State\` VARCHAR(30) DEFAULT NULL,
        \`City\` VARCHAR(30) DEFAULT NULL,
        \`Address_Line\` VARCHAR(255) DEFAULT NULL,
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`user_id\`),
        UNIQUE KEY \`Email\` (\`Email\`),
        UNIQUE KEY \`Phone\` (\`Phone\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 2. Department table
      CREATE TABLE IF NOT EXISTS \`Department\` (
        \`department_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`Name\` VARCHAR(100) NOT NULL,
        \`Contact_info\` VARCHAR(255) DEFAULT NULL,
        PRIMARY KEY (\`department_id\`),
        UNIQUE KEY \`Name\` (\`Name\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 3. category table (no foreign key constraint)
      CREATE TABLE IF NOT EXISTS \`category\` (
        \`category_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`Name\` VARCHAR(100) NOT NULL,
        \`department_id\` BIGINT DEFAULT NULL,
        PRIMARY KEY (\`category_id\`),
        KEY \`department_id\` (\`department_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 4. Worker table (no foreign key constraint)
      CREATE TABLE IF NOT EXISTS \`Worker\` (
        \`worker_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`First_name\` VARCHAR(40) NOT NULL,
        \`Last_name\` VARCHAR(40) NOT NULL,
        \`Phone\` VARCHAR(15) NOT NULL,
        \`Skill_1\` VARCHAR(30) DEFAULT NULL,
        \`Skill_2\` VARCHAR(30) DEFAULT NULL,
        \`Skill_3\` VARCHAR(30) DEFAULT NULL,
        \`Skill_4\` VARCHAR(30) DEFAULT NULL,
        \`department_id\` BIGINT DEFAULT NULL,
        PRIMARY KEY (\`worker_id\`),
        KEY \`department_id\` (\`department_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 5. Official table (no foreign key constraint)
      CREATE TABLE IF NOT EXISTS \`Official\` (
        \`official_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`First_name\` VARCHAR(40) NOT NULL,
        \`Last_name\` VARCHAR(40) NOT NULL,
        \`Email\` VARCHAR(100) NOT NULL,
        \`Phone\` VARCHAR(15) NOT NULL,
        \`Password_hash\` VARCHAR(255) NOT NULL,
        \`Login_credentials\` VARCHAR(50) NOT NULL,
        \`department_id\` BIGINT DEFAULT NULL,
        PRIMARY KEY (\`official_id\`),
        KEY \`department_id\` (\`department_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 6. Complaint table (dummied foreign keys so citizen submissions never fail)
      CREATE TABLE IF NOT EXISTS \`Complaint\` (
        \`complaint_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`category_id\` BIGINT DEFAULT 1,
        \`department_id\` BIGINT DEFAULT 1,
        \`description\` TEXT,
        \`status\` ENUM('reported','in-progress','resolved','rejected') DEFAULT 'reported',
        \`imageUrl\` VARCHAR(255) DEFAULT NULL,
        \`Pincode\` VARCHAR(10) NOT NULL,
        \`State\` VARCHAR(30) NOT NULL,
        \`City\` VARCHAR(30) NOT NULL,
        \`Address_Line\` VARCHAR(255) DEFAULT NULL,
        \`latitude\` VARCHAR(50) DEFAULT NULL,
        \`longitude\` VARCHAR(50) DEFAULT NULL,
        \`detected_city\` VARCHAR(50) DEFAULT NULL,
        \`detected_state\` VARCHAR(50) DEFAULT NULL,
        \`detected_address\` VARCHAR(255) DEFAULT NULL,
        \`hasFace\` TINYINT DEFAULT '0',
        \`rejection_reason\` TEXT,
        \`rejected_by\` BIGINT DEFAULT NULL,
        \`rejected_at\` DATETIME DEFAULT NULL,
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`complaint_id\`),
        KEY \`user_id\` (\`user_id\`),
        KEY \`category_id\` (\`category_id\`),
        KEY \`department_id\` (\`department_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 7. assignment table (no foreign key constraints to official/worker)
      CREATE TABLE IF NOT EXISTS \`assignment\` (
        \`assignment_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`complaint_id\` BIGINT NOT NULL,
        \`official_id\` BIGINT DEFAULT 1,
        \`worker_id\` BIGINT DEFAULT 1,
        \`assigned_date\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`status\` ENUM('in-progress','done') DEFAULT 'in-progress',
        PRIMARY KEY (\`assignment_id\`),
        KEY \`complaint_id\` (\`complaint_id\`),
        KEY \`worker_id\` (\`worker_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 8. Worker_Rating table
      CREATE TABLE IF NOT EXISTS \`Worker_Rating\` (
        \`rating_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`assignment_id\` BIGINT UNIQUE,
        \`worker_id\` BIGINT DEFAULT NULL,
        \`complaint_id\` BIGINT DEFAULT NULL,
        \`rating\` TINYINT DEFAULT NULL,
        \`review\` TEXT,
        \`confirmed\` TINYINT DEFAULT '0',
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`rating_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

      -- 9. Chat_History table
      CREATE TABLE IF NOT EXISTS \`Chat_History\` (
        \`chat_id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`user_message\` TEXT NOT NULL,
        \`ai_response\` TEXT NOT NULL,
        \`language\` VARCHAR(10) DEFAULT 'hi',
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`chat_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

      -- 10. Conversation_Sessions table
      CREATE TABLE IF NOT EXISTS \`Conversation_Sessions\` (
        \`session_id\` INT NOT NULL AUTO_INCREMENT,
        \`user_id\` BIGINT NOT NULL,
        \`conversation_data\` JSON,
        \`created_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`session_id\`),
        KEY \`idx_user_id\` (\`user_id\`),
        KEY \`idx_created_at\` (\`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.query(createTablesSQL);
    console.log('✅ Tables created successfully in MinorDBFake');

    // Populate Seed Data
    // Clean existing seed if re-running
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
    await connection.query('TRUNCATE TABLE `User`;');
    await connection.query('TRUNCATE TABLE `Department`;');
    await connection.query('TRUNCATE TABLE `category`;');
    await connection.query('TRUNCATE TABLE `Worker`;');
    await connection.query('TRUNCATE TABLE `Official`;');
    await connection.query('TRUNCATE TABLE `Complaint`;');
    await connection.query('TRUNCATE TABLE `assignment`;');
    await connection.query('TRUNCATE TABLE `Worker_Rating`;');
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    // 1. Insert Users (User 1 = Mikul Jain with password Mikul0123@)
    const usersSQL = `
      INSERT INTO \`User\` (\`user_id\`, \`First_name\`, \`Last_name\`, \`Email\`, \`Phone\`, \`Password_hash\`, \`Pincode\`, \`State\`, \`City\`, \`Address_Line\`)
      VALUES 
      (1, 'Mikul', 'Jain', 'mikuljain09@gmail.com', '9589325550', '$2b$10$H.zPo5zsxxcZr0VPzNvrmuvh/vLG2xbXzwR2Yd32u2R9ZCEJ4AUqW', '452018', 'Madhya Pradesh', 'Indore', 'Sector B, Scheme 54'),
      (2, 'Anita', 'Sharma', 'anita.sharma@example.com', '9876543299', '$2b$10$H.zPo5zsxxcZr0VPzNvrmuvh/vLG2xbXzwR2Yd32u2R9ZCEJ4AUqW', '452018', 'Madhya Pradesh', 'Indore', 'Lane 3, Vijay Nagar');
    `;
    await connection.query(usersSQL);
    console.log('✅ Seeded Users');

    // 2. Insert Departments
    const deptSQL = `
      INSERT INTO \`Department\` (\`department_id\`, \`Name\`, \`Contact_info\`)
      VALUES
      (1, 'Water Supply', 'water.dept@indoremunicipal.gov.in | 0731-2530101'),
      (2, 'Electricity', 'power.dept@indoremunicipal.gov.in | 0731-2530102'),
      (3, 'Road Maintenance', 'roads.dept@indoremunicipal.gov.in | 0731-2530103'),
      (4, 'Sanitation', 'sanitation.dept@indoremunicipal.gov.in | 0731-2530104'),
      (5, 'Public Health', 'health.dept@indoremunicipal.gov.in | 0731-2530105'),
      (6, 'Parks & Recreation', 'parks.dept@indoremunicipal.gov.in | 0731-2530106'),
      (7, 'Public Safety', 'safety.dept@indoremunicipal.gov.in | 0731-2530107'),
      (8, 'Roads & Transport', 'transport.dept@indoremunicipal.gov.in | 0731-2530108');
    `;
    await connection.query(deptSQL);
    console.log('✅ Seeded Departments');

    // 3. Insert Categories
    const catSQL = `
      INSERT INTO \`category\` (\`category_id\`, \`Name\`, \`department_id\`)
      VALUES
      -- Water Supply (dept 1)
      (1, 'Water Leakage', 1),
      (2, 'Low Water Pressure', 1),
      (3, 'Contaminated Water', 1),
      (4, 'Pipeline Broken', 1),
      (5, 'Water Supply', 1),

      -- Electricity (dept 2)
      (6, 'Street Light Not Working', 2),
      (7, 'Power Outage', 2),
      (8, 'Transformer Issue', 2),
      (9, 'Fallen Wire', 2),
      (10, 'Electricity', 2),

      -- Road Maintenance (dept 3 & 8)
      (11, 'Potholes', 3),
      (12, 'Damaged Road', 3),
      (13, 'Open Manhole', 3),
      (14, 'Footpath Blocked', 3),
      (15, 'Road Maintenance', 3),

      -- Sanitation (dept 4)
      (16, 'Garbage Overflow', 4),
      (17, 'Sewage Blockage', 4),
      (18, 'Dead Animal Removal', 4),
      (19, 'Public Toilet Cleaning', 4),
      (20, 'Sanitation', 4),

      -- Public Health (dept 5)
      (21, 'Mosquito Breeding', 5),
      (22, 'Stagnant Water', 5),
      (23, 'Food Safety Issue', 5),
      (24, 'Public Health', 5),

      -- Parks & Recreation (dept 6)
      (25, 'Broken Equipment', 6),
      (26, 'Grass Trimming', 6),
      (27, 'Park Bench Damaged', 6),

      -- Public Safety (dept 7)
      (28, 'Stray Animals', 7),
      (29, 'Illegal Parking', 7),
      (30, 'Safety Hazard', 7),
      (31, 'Public Safety', 7);
    `;
    await connection.query(catSQL);
    console.log('✅ Seeded Categories');

    // 4. Insert Dummy Workers
    const workerSQL = `
      INSERT INTO \`Worker\` (\`worker_id\`, \`First_name\`, \`Last_name\`, \`Phone\`, \`Skill_1\`, \`Skill_2\`, \`department_id\`)
      VALUES
      (1, 'Ramesh', 'Kumar', '9876543210', 'Plumbing', 'Pipeline Repair', 1),
      (2, 'Suresh', 'Sharma', '9876543211', 'Electrical', 'Street Lighting', 2),
      (3, 'Vikram', 'Singh', '9876543212', 'Roadwork', 'Asphalt Patching', 3),
      (4, 'Rajesh', 'Verma', '9876543213', 'Sanitation', 'Waste Disposal', 4),
      (5, 'Amit', 'Patel', '9876543214', 'Public Health', 'Fumigation', 5);
    `;
    await connection.query(workerSQL);
    console.log('✅ Seeded Workers');

    // 5. Insert Dummy Official
    const officialSQL = `
      INSERT INTO \`Official\` (\`official_id\`, \`First_name\`, \`Last_name\`, \`Email\`, \`Phone\`, \`Password_hash\`, \`Login_credentials\`, \`department_id\`)
      VALUES
      (1, 'Municipal', 'Officer', 'official@indoremunicipal.gov.in', '9876543200', '$2b$10$y8U.bI2LBL1pdcCAr2BvW.AsfxNI.O5urQ5BYz9cfYThw2HSEfO6W', 'OFFICIAL01', 1);
    `;
    await connection.query(officialSQL);
    console.log('✅ Seeded Official');

    // 6. Insert Complaints for user 1 & local area
    const complaintSQL = `
      INSERT INTO \`Complaint\` 
      (\`complaint_id\`, \`user_id\`, \`category_id\`, \`department_id\`, \`description\`, \`status\`, \`imageUrl\`, \`Pincode\`, \`State\`, \`City\`, \`Address_Line\`, \`created_at\`)
      VALUES
      -- 1: Resolved & Rated
      (1, 1, 1, 1, 'Main water supply line burst near road intersection. Clean drinking water was flowing continuously into the street.', 'resolved', NULL, '452018', 'Madhya Pradesh', 'Indore', 'Plot 42, Scheme 54, Indore', DATE_SUB(NOW(), INTERVAL 3 DAY)),

      -- 2: Resolved & Ready for Citizen Confirmation & Rating
      (2, 1, 6, 2, 'Street light pole #14 has stopped functioning completely. The entire intersection is dark at night creating risk for pedestrians.', 'resolved', NULL, '452018', 'Madhya Pradesh', 'Indore', 'Near Community Park, Scheme 54', DATE_SUB(NOW(), INTERVAL 2 DAY)),

      -- 3: In-Progress with Assigned Worker
      (3, 1, 11, 3, 'Severe potholes after recent monsoon rain right in front of the public school. Two-wheelers frequently losing balance.', 'in-progress', NULL, '452018', 'Madhya Pradesh', 'Indore', 'Sector B Main Road, Scheme 54', DATE_SUB(NOW(), INTERVAL 1 DAY)),

      -- 4: Reported / Pending
      (4, 1, 16, 4, 'Municipal garbage collection bin overflowing onto sidewalk. Needs urgent clearance to prevent foul odor.', 'reported', NULL, '452018', 'Madhya Pradesh', 'Indore', 'Opposite Market Complex, Scheme 54', DATE_SUB(NOW(), INTERVAL 4 HOUR)),

      -- 5 & 6: Area Problems for user's locality (user 2)
      (5, 2, 17, 4, 'Sewage drainage line choked near Community Hall, causing water logging on sidewalk.', 'reported', NULL, '452018', 'Madhya Pradesh', 'Indore', 'Near Community Hall, Scheme 54', DATE_SUB(NOW(), INTERVAL 6 HOUR)),
      (6, 2, 8, 2, 'Overhead electric wires loose and hanging dangerously low near tree branches.', 'reported', NULL, '452018', 'Madhya Pradesh', 'Indore', '5th Cross Road, Scheme 54', DATE_SUB(NOW(), INTERVAL 12 HOUR));
    `;
    await connection.query(complaintSQL);
    console.log('✅ Seeded Complaints');

    // 7. Insert Assignments linking complaints to workers
    const assignSQL = `
      INSERT INTO \`assignment\` (\`assignment_id\`, \`complaint_id\`, \`official_id\`, \`worker_id\`, \`assigned_date\`, \`status\`)
      VALUES
      (1, 1, 1, 1, DATE_SUB(NOW(), INTERVAL 3 DAY), 'done'),
      (2, 2, 1, 2, DATE_SUB(NOW(), INTERVAL 2 DAY), 'done'),
      (3, 3, 1, 3, DATE_SUB(NOW(), INTERVAL 1 DAY), 'in-progress');
    `;
    await connection.query(assignSQL);
    console.log('✅ Seeded Assignments');

    // 8. Insert Worker Ratings
    const ratingSQL = `
      INSERT INTO \`Worker_Rating\` (\`rating_id\`, \`assignment_id\`, \`worker_id\`, \`complaint_id\`, \`rating\`, \`review\`, \`confirmed\`, \`created_at\`)
      VALUES
      (1, 1, 1, 1, 5, 'Plumber arrived promptly and repaired the broken pipeline cleanly. Highly satisfied with the municipal response.', 1, DATE_SUB(NOW(), INTERVAL 2 DAY)),
      (2, 2, 2, 2, NULL, NULL, 0, DATE_SUB(NOW(), INTERVAL 1 DAY));
    `;
    await connection.query(ratingSQL);
    console.log('✅ Seeded Worker Ratings');

    console.log('\n🎉 MinorDBFake setup completed successfully with all tables and dummy data!');
  } catch (err) {
    console.error('❌ Error during MinorDBFake setup:', err);
  } finally {
    await connection.end();
  }
}

initFakeDb();
