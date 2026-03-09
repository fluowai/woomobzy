import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

async function testVercel() {
  const token = process.env.VERCEL_API_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  
  const fullDomain = 'test-debug-vercel.imobzy.com.br';
  const url = `https://api.vercel.com/v10/projects/${projectId}/domains`;
  const params = teamId ? { teamId } : {};

  console.log('Testing Vercel API...');
  console.log({ url, params, token: token ? 'Provided' : 'Missing' });

  try {
    const response = await axios.post(
      url,
      { name: fullDomain },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params,
      }
    );
    console.log('Success:', response.data);
  } catch (err) {
    console.error('Error Status:', err.response?.status);
    console.error('Error Data:', JSON.stringify(err.response?.data, null, 2));
  }
}

testVercel();
