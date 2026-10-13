const http = require('http');
const jwt = require('jsonwebtoken');
const secret = 'replace-with-a-long-random-secret';
const driver = jwt.sign({ sub: 24, rol: 'CHOFER', username: '13959130' }, secret, { expiresIn: '1h' });
const post = (path, token, body) => new Promise((resolve) => {
  const data = JSON.stringify(body);
  const req = http.request({ hostname: 'localhost', port: 3000, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': data.length, 'Authorization': 'Bearer ' + token } }, (res) => {
    let chunks = '';
    res.on('data', c => chunks += c);
    res.on('end', () => {
      let status = 'n/a';
      try { status = JSON.parse(chunks).status ?? status; } catch { status = chunks.slice(0, 120); }
      resolve(`${res.statusCode} ${status}`);
    });
  });
  req.on('error', e => resolve('ERR ' + e.message));
  req.write(data); req.end();
});

(async () => {
  console.log('STOPPED ->', await post('/trips/10/events', driver, { type: 'STOPPED' }));
  console.log('RESUME  ->', await post('/trips/10/events', driver, { type: 'RESUME' }));
})();
