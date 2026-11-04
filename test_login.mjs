import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('http://localhost:3002/api/auth/login', {
      email: 'test@example.com',
      password: 'password123',
    });
    console.log(res.data);
  } catch (err) {
    if (err.response) {
      console.error('Error status:', err.response.status);
      console.error('Error data:', err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

test();
