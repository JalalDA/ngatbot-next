import https from 'https';
import { URL } from 'url';

// Bot token
const BOT_TOKEN = '7714021851:AAGUR8CUp53S4b0Ph-ejJaZUjX0Y0_0TvV8';
// Webhook URL (akan diupdate ke production URL)
const WEBHOOK_URL = 'https://90e7a867-1c5e-4d83-b6ed-8c7bb94c316a-00-mdlf6gheb2ke.janeway.replit.dev/api/webhook/nonai/7';

function setWebhook() {
  const url = new URL(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`);
  
  const postData = JSON.stringify({
    url: WEBHOOK_URL
  });

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', JSON.parse(data));
    });
  });

  req.on('error', (e) => {
    console.error('Error:', e);
  });

  req.write(postData);
  req.end();
}

setWebhook();