// src/db/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

const users = [
  { name: 'Arjun Sharma',    email: 'arjun@college.edu',    branch: 'CSE',  year: 3, bio: 'Full-stack dev. Building a fintech startup idea. Looking for a designer co-founder.',
    skills: [['React','strong'],['Node.js','building'],['DSA','learning'],['PostgreSQL','learning']] },

  { name: 'Priya Nair',      email: 'priya@college.edu',    branch: 'CSE',  year: 2, bio: 'ML enthusiast. Obsessed with NLP. Want to work on real-world AI products.',
    skills: [['Python','strong'],['ML','building'],['TensorFlow','learning'],['DSA','building']] },

  { name: 'Rohan Mehta',     email: 'rohan@college.edu',    branch: 'ECE',  year: 4, bio: 'Embedded systems + IoT. Built a smart irrigation system last semester.',
    skills: [['C++','strong'],['Arduino','strong'],['Python','learning'],['IoT','building']] },

  { name: 'Sneha Iyer',      email: 'sneha@college.edu',    branch: 'CSE',  year: 3, bio: 'UI/UX designer who can code. Figma to React pipeline is my thing.',
    skills: [['UI Design','strong'],['React','building'],['Figma','strong'],['CSS','strong']] },

  { name: 'Karan Patel',     email: 'karan@college.edu',    branch: 'IT',   year: 2, bio: 'Backend guy. Love databases and system design. Competitive programmer on the side.',
    skills: [['Node.js','strong'],['PostgreSQL','strong'],['DSA','strong'],['Redis','curious']] },

  { name: 'Ananya Singh',    email: 'ananya@college.edu',   branch: 'CSE',  year: 1, bio: 'Just started learning. Passionate about web dev. Looking for a study group.',
    skills: [['HTML/CSS','learning'],['JavaScript','learning'],['React','curious']] },

  { name: 'Vikram Rao',      email: 'vikram@college.edu',   branch: 'CSE',  year: 4, bio: 'DevOps and cloud. AWS certified. Help teams ship faster.',
    skills: [['AWS','strong'],['Docker','strong'],['Kubernetes','building'],['Linux','strong']] },

  { name: 'Meera Krishnan',  email: 'meera@college.edu',    branch: 'DS',   year: 3, bio: 'Data science + visualization. Love finding stories in messy datasets.',
    skills: [['Python','strong'],['Pandas','strong'],['ML','learning'],['Tableau','building']] },

  { name: 'Aditya Joshi',    email: 'aditya@college.edu',   branch: 'CSE',  year: 2, bio: 'Mobile dev. Built 3 Flutter apps. Looking for hackathon teammates.',
    skills: [['Flutter','strong'],['Dart','strong'],['Firebase','building'],['UI Design','learning']] },

  { name: 'Riya Desai',      email: 'riya@college.edu',     branch: 'IT',   year: 3, bio: 'Cybersecurity nerd. CTF player. Want to build a security-focused project.',
    skills: [['Linux','strong'],['Python','building'],['Networking','building'],['Ethical Hacking','learning']] },

  { name: 'Siddharth Kumar', email: 'sid@college.edu',      branch: 'CSE',  year: 4, bio: 'Final year. Ex-intern at Razorpay. Love distributed systems.',
    skills: [['Java','strong'],['Spring Boot','strong'],['Kafka','building'],['DSA','strong']] },

  { name: 'Tanvi Reddy',     email: 'tanvi@college.edu',    branch: 'CSE',  year: 2, bio: 'Open source contributor. React + TypeScript is my stack.',
    skills: [['React','building'],['TypeScript','learning'],['Git','strong'],['Node.js','curious']] },

  { name: 'Nikhil Verma',    email: 'nikhil@college.edu',   branch: 'ECE',  year: 3, bio: 'Signal processing and ML. Want to combine both in a cool project.',
    skills: [['MATLAB','strong'],['Python','building'],['ML','curious'],['C++','building']] },

  { name: 'Ishaan Malhotra', email: 'ishaan@college.edu',   branch: 'CSE',  year: 1, bio: 'Game dev aspirant. Learning Unity. Looking for artists to collab with.',
    skills: [['Unity','learning'],['C#','learning'],['Blender','curious']] },

  { name: 'Divya Menon',     email: 'divya@college.edu',    branch: 'IT',   year: 4, bio: 'Product-minded developer. Built 2 side projects that got real users.',
    skills: [['React','strong'],['Node.js','strong'],['Product Thinking','strong'],['SQL','building']] },

  { name: 'Harsh Agarwal',   email: 'harsh@college.edu',    branch: 'CSE',  year: 2, bio: 'Competitive programmer. 4-star CodeChef. Want to apply DSA in real projects.',
    skills: [['DSA','strong'],['C++','strong'],['Python','building'],['System Design','curious']] },

  { name: 'Pooja Bhatt',     email: 'pooja@college.edu',    branch: 'DS',   year: 3, bio: 'Building an ML model to predict student dropout rates. Open to collaborators.',
    skills: [['Python','strong'],['ML','building'],['SQL','building'],['Statistics','strong']] },

  { name: 'Rahul Nambiar',   email: 'rahul@college.edu',    branch: 'CSE',  year: 4, bio: 'Blockchain dev. Wrote smart contracts for a DeFi hackathon project.',
    skills: [['Solidity','building'],['JavaScript','strong'],['Web3.js','building'],['React','strong']] },

  { name: 'Simran Kaur',     email: 'simran@college.edu',   branch: 'IT',   year: 2, bio: 'Frontend focused. Love animations and micro-interactions. CSS wizard.',
    skills: [['CSS','strong'],['React','building'],['Figma','building'],['JavaScript','building']] },

  { name: 'Akash Tiwari',    email: 'akash@college.edu',    branch: 'CSE',  year: 3, bio: 'Backend + infra. Built a real-time chat app using WebSockets.',
    skills: [['Node.js','strong'],['WebSockets','building'],['Redis','building'],['Docker','learning']] },

  { name: 'Nandita Roy',     email: 'nandita@college.edu',  branch: 'DS',   year: 1, bio: 'New to data science. Strong in maths. Looking for project partners.',
    skills: [['Python','learning'],['Statistics','strong'],['Excel','strong'],['ML','curious']] },

  { name: 'Yash Gupta',      email: 'yash@college.edu',     branch: 'CSE',  year: 4, bio: 'Android dev. Published 2 apps on Play Store. 10k+ downloads combined.',
    skills: [['Kotlin','strong'],['Android','strong'],['Firebase','strong'],['Java','building']] },

  { name: 'Kavya Pillai',    email: 'kavya@college.edu',    branch: 'ECE',  year: 2, bio: 'Hardware + software bridge. Love making physical things smart.',
    skills: [['Arduino','strong'],['Python','building'],['C','strong'],['IoT','building']] },

  { name: 'Devansh Shah',    email: 'devansh@college.edu',  branch: 'IT',   year: 3, bio: 'Full-stack with a design eye. Looking for SIH teammates — need ML person.',
    skills: [['React','strong'],['Python','learning'],['Node.js','building'],['UI Design','building']] },

  { name: 'Bhavna Jain',     email: 'bhavna@college.edu',   branch: 'CSE',  year: 2, bio: 'NLP + chatbots. Built a college FAQ bot. Want to make it smarter.',
    skills: [['Python','strong'],['NLP','building'],['ML','learning'],['Flask','building']] },

  { name: 'Omkar Patil',     email: 'omkar@college.edu',    branch: 'CSE',  year: 4, bio: 'SDE intern at a startup. Strong in system design. Happy to mentor juniors.',
    skills: [['Java','strong'],['DSA','strong'],['System Design','building'],['SQL','strong']] },

  { name: 'Trisha Das',      email: 'trisha@college.edu',   branch: 'DS',   year: 3, bio: 'Computer vision projects. Working on a gesture recognition system.',
    skills: [['Python','strong'],['OpenCV','building'],['ML','building'],['TensorFlow','learning']] },

  { name: 'Varun Saxena',    email: 'varun@college.edu',    branch: 'CSE',  year: 1, bio: 'Beginner but motivated. Completed 2 online courses. Looking for a mentor.',
    skills: [['Python','learning'],['HTML/CSS','learning'],['Git','curious']] },

  { name: 'Anjali Choudhary',email: 'anjali@college.edu',   branch: 'IT',   year: 4, bio: 'ML + product. Want to build AI tools that solve real Indian college problems.',
    skills: [['Python','strong'],['ML','strong'],['Product Thinking','building'],['React','learning']] },

  { name: 'Parth Trivedi',   email: 'parth@college.edu',    branch: 'CSE',  year: 3, bio: 'Cloud native developer. GCP Associate certified. Love serverless.',
    skills: [['GCP','building'],['Node.js','strong'],['Docker','building'],['Python','building']] },

  { name: 'Shreya Bose',     email: 'shreya@college.edu',   branch: 'DS',   year: 2, bio: 'Stats + data viz. Making complex data easy to understand.',
    skills: [['R','strong'],['Python','building'],['Tableau','strong'],['Statistics','strong']] },

  { name: 'Chirag Soni',     email: 'chirag@college.edu',   branch: 'CSE',  year: 3, bio: 'Security researcher. Bug bounty hunter. Found vulns in 3 platforms.',
    skills: [['Ethical Hacking','building'],['Python','strong'],['Linux','strong'],['Networking','building']] },

  { name: 'Preeti Sharma',   email: 'preeti@college.edu',   branch: 'IT',   year: 2, bio: 'Frontend developer with an eye for good UX. Currently learning React.',
    skills: [['HTML/CSS','strong'],['JavaScript','strong'],['React','learning'],['Figma','building']] },

  { name: 'Kunal Mishra',    email: 'kunal@college.edu',    branch: 'CSE',  year: 4, bio: 'Research oriented. Published a paper on graph algorithms. Loves theory.',
    skills: [['DSA','strong'],['C++','strong'],['Research','strong'],['Python','building']] },

  { name: 'Ritika Pandey',   email: 'ritika@college.edu',   branch: 'CSE',  year: 1, bio: 'Just started. Want to get into web dev. Joined a college tech club.',
    skills: [['HTML/CSS','curious'],['Python','learning']] },

  { name: 'Sameer Qureshi',  email: 'sameer@college.edu',   branch: 'ECE',  year: 3, bio: 'VLSI + embedded. Niche but passionate. Looking for interdisciplinary projects.',
    skills: [['VLSI','building'],['C','strong'],['Python','learning'],['Arduino','building']] },

  { name: 'Lakshmi Venkat',  email: 'lakshmi@college.edu',  branch: 'CSE',  year: 2, bio: 'Open source lover. Contributed to 3 GitHub projects. React + TypeScript.',
    skills: [['React','building'],['TypeScript','building'],['Git','strong'],['Node.js','learning']] },

  { name: 'Abhishek Dubey',  email: 'abhishek@college.edu', branch: 'IT',   year: 4, bio: 'DevOps + backend. Obsessed with making systems reliable and fast.',
    skills: [['Docker','strong'],['Kubernetes','building'],['Python','strong'],['Linux','strong']] },

  { name: 'Natasha Fernandes',email:'natasha@college.edu',  branch: 'DS',   year: 3, bio: 'Data analyst. Worked on a real project with an NGO to track health data.',
    skills: [['SQL','strong'],['Python','building'],['Tableau','building'],['Excel','strong']] },

  { name: 'Gaurav Tomar',    email: 'gaurav@college.edu',   branch: 'CSE',  year: 2, bio: 'Hackathon addict. Participated in 5, won 2. Always looking for next team.',
    skills: [['React','building'],['Node.js','building'],['Firebase','strong'],['UI Design','curious']] },

  { name: 'Isha Kulkarni',   email: 'isha@college.edu',     branch: 'IT',   year: 3, bio: 'Backend + databases. Optimized a slow query from 4s to 80ms once. Loved it.',
    skills: [['PostgreSQL','strong'],['Python','strong'],['Redis','building'],['DSA','building']] },

  { name: 'Manav Oberoi',    email: 'manav@college.edu',    branch: 'CSE',  year: 1, bio: 'Learning to code. Python first. Interested in AI eventually.',
    skills: [['Python','learning'],['DSA','curious']] },

  { name: 'Deepika Rao',     email: 'deepika@college.edu',  branch: 'DS',   year: 4, bio: 'Final year data science. Job hunting. Strong portfolio of 6 projects.',
    skills: [['Python','strong'],['ML','strong'],['SQL','strong'],['Pandas','strong']] },

  { name: 'Shubham Tiwari',  email: 'shubham@college.edu',  branch: 'CSE',  year: 3, bio: 'Game dev + graphics. Working on a 2D platformer in Unity.',
    skills: [['Unity','building'],['C#','building'],['Blender','learning'],['DSA','learning']] },

  { name: 'Farida Sheikh',   email: 'farida@college.edu',   branch: 'IT',   year: 2, bio: 'UI/UX + frontend. Believe design is problem solving, not decoration.',
    skills: [['Figma','strong'],['UI Design','strong'],['React','learning'],['CSS','strong']] },

  { name: 'Pranav Hegde',    email: 'pranav@college.edu',   branch: 'CSE',  year: 4, bio: 'Compiler design + PL theory geek. Also writes clean production code.',
    skills: [['C++','strong'],['Python','strong'],['DSA','strong'],['System Design','building']] },

  { name: 'Aditi Bansal',    email: 'aditi@college.edu',    branch: 'DS',   year: 2, bio: 'Stats background, moving into ML. Love Kaggle competitions.',
    skills: [['Python','building'],['Statistics','strong'],['ML','learning'],['Pandas','building']] },

  { name: 'Saurabh Pillai',  email: 'saurabh@college.edu',  branch: 'CSE',  year: 3, bio: 'Full-stack + cloud. Built a SaaS tool used by 200+ students in college.',
    skills: [['React','strong'],['Node.js','strong'],['AWS','building'],['PostgreSQL','building']] },

  { name: 'Meghna Tripathi', email: 'meghna@college.edu',   branch: 'ECE',  year: 2, bio: 'Robotics club lead. Combining hardware skills with computer vision.',
    skills: [['Python','building'],['OpenCV','learning'],['C++','strong'],['ROS','curious']] },

  { name: 'Aryan Kapoor',    email: 'aryan@college.edu',    branch: 'IT',   year: 4, bio: 'Startup guy. Co-founded a campus delivery app. Now looking for next idea.',
    skills: [['React Native','strong'],['Node.js','strong'],['Product Thinking','strong'],['Firebase','strong']] },
];

const groups = [
  { name: 'Smart India Hackathon 2025', purpose: 'Building a solution for rural healthcare access. Need ML + backend people.', type: 'open' },
  { name: 'DSA Study Circle',           purpose: 'Daily LeetCode problems + weekly mock interviews. All levels welcome.', type: 'open' },
  { name: 'Open Source Contributors',   purpose: 'Finding good first issues together and reviewing each other\'s PRs.', type: 'open' },
  { name: 'ML Paper Reading Group',     purpose: 'Reading one ML paper per week and discussing it. Currently on Attention Is All You Need.', type: 'open' },
  { name: 'Web Dev Bootcamp',           purpose: 'Juniors learning web dev together. Seniors mentor. React + Node stack.', type: 'open' },
  { name: 'Game Dev Club',              purpose: 'Making a game together. Unity + C#. Looking for artists and programmers.', type: 'open' },
  { name: 'Startup Founders Circle',    purpose: 'Students working on or interested in startups. Weekly idea sharing sessions.', type: 'closed' },
  { name: 'Competitive Programming',    purpose: 'Codeforces + ICPC prep. Serious group — minimum 3-star rating preferred.', type: 'closed' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding users...');
    const password = 'password123'; // all demo users share this password
    const hash = await bcrypt.hash(password, 10); // cost 10 for speed during seeding

    const userIds = [];

    for (const u of users) {
      // Upsert — safe to run multiple times
      const result = await client.query(
        `INSERT INTO users (email, password_hash, name, branch, year, bio)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [u.email, hash, u.name, u.branch, u.year, u.bio]
      );
      const userId = result.rows[0].id;
      userIds.push(userId);

      // Clear old skills and re-insert
      await client.query('DELETE FROM skills WHERE user_id = $1', [userId]);
      for (const [name, level] of u.skills) {
        await client.query(
          'INSERT INTO skills (user_id, name, level) VALUES ($1, $2, $3)',
          [userId, name, level]
        );
      }
    }

    console.log(`✓ ${users.length} users seeded`);

    // Create groups owned by first few users
    console.log('Seeding groups...');
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const creatorId = userIds[i % userIds.length];

      const result = await client.query(
        `INSERT INTO groups (name, purpose, type, creator_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [g.name, g.purpose, g.type, creatorId]
      );

      if (result.rows[0]) {
        const groupId = result.rows[0].id;
        // Add creator as admin
        await client.query(
          `INSERT INTO group_members (group_id, user_id, role, status)
           VALUES ($1, $2, 'admin', 'accepted')
           ON CONFLICT DO NOTHING`,
          [groupId, creatorId]
        );
        // Add 3-5 random members
        const memberCount = 3 + (i % 3);
        for (let m = 1; m <= memberCount; m++) {
          const memberId = userIds[(i + m) % userIds.length];
          if (memberId !== creatorId) {
            await client.query(
              `INSERT INTO group_members (group_id, user_id, role, status)
               VALUES ($1, $2, 'member', 'accepted')
               ON CONFLICT DO NOTHING`,
              [groupId, memberId]
            );
          }
        }
      }
    }

    console.log(`✓ ${groups.length} groups seeded`);

    // Seed some connections between users
    console.log('Seeding connections...');
    const connectionPairs = [
      [0,1],[0,2],[1,3],[2,4],[3,5],[4,6],[5,7],[6,8],[7,9],
      [1,5],[2,6],[3,7],[4,8],[0,9],[1,10],[2,11],[3,12],
    ];
    for (const [a, b] of connectionPairs) {
      await client.query(
        `INSERT INTO connections (sender_id, receiver_id, status, message)
         VALUES ($1, $2, 'accepted', 'Hey, saw your profile — would love to connect!')
         ON CONFLICT DO NOTHING`,
        [userIds[a], userIds[b]]
      );
    }
    console.log(`✓ ${connectionPairs.length} connections seeded`);

    console.log('\n✅ Seed complete!');
    console.log('All users have password: password123');
    console.log('Try logging in as: arjun@college.edu / password123');

  } catch (err) {
    console.error('Seed failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();