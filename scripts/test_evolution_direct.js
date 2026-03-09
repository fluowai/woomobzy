
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from root
dotenv.config({ path: resolve(__dirname, '../.env') });

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

console.log('Testing Evolution API Connection (ESM)...');
console.log('URL:', EVOLUTION_API_URL);
console.log('Key:', EVOLUTION_API_KEY ? '******' : 'MISSING');

async function testConnection() {
    try {
        console.log('\n--- Checking Server Status ---');
        // Check /instance/fetchInstances
        const instancesUrl = `${EVOLUTION_API_URL}/instance/fetchInstances`;
        
        console.log(`GET ${instancesUrl}`);
        
        const response = await axios.get(instancesUrl, {
            headers: {
                'apikey': EVOLUTION_API_KEY
            }
        });

        console.log('Response Status:', response.status);
        console.log('Instances Found:', response.data.length);
        
        if (Array.isArray(response.data)) {
            console.log('JSON_INSTANCES_START');
            console.log(JSON.stringify(response.data.map(i => i.name), null, 2));
            console.log('JSON_INSTANCES_END');
        } else {
            console.log('Unexpected response format:', JSON.stringify(response.data, null, 2));
        }

    } catch (error) {
        console.error('\n!!! CONNECTION FAILED !!!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testConnection();
