import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function listVercelProjects() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  
  console.log('Fetching Vercel Projects...');

  try {
    const response = await axios.get(
      `https://api.vercel.com/v9/projects`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    
    const projects = response.data.projects || [];
    if (projects.length === 0) {
      console.log('No projects found on this Vercel account.');
      console.log('If your project is under a Team, we need the VERCEL_TEAM_ID to find it.');
    } else {
      console.log(`Found ${projects.length} project(s):`);
      projects.forEach(p => {
        console.log(`- Name: ${p.name}`);
        console.log(`  ID: ${p.id}`);
      });
    }
  } catch (err) {
    console.error('Error fetching projects:', err.response?.data || err.message);
  }
}

listVercelProjects();
