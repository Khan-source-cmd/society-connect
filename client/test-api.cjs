const http = require('http');

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', (e) => reject(e.message));
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('Testing /api/notices...');
    const result = await makeRequest('/api/notices');
    console.log('Status:', result.status);
    console.log('Response:', result.body.substring(0, 500));
  } catch (e) {
    console.log('Error:', e);
  }
}

testAPI();
