import WebSocket from 'ws';

async function testWSRobust() {
  console.log('Testing WebSocket Robustness (Heartbeat & Validation)...');
  const ws = new WebSocket('ws://localhost:3001');

  ws.on('open', () => {
    console.log('Connected. Sending PING...');
    ws.send(JSON.stringify({ type: 'PING' }));

    console.log('Sending invalid message (should be caught by Zod)...');
    ws.send(JSON.stringify({ type: 'INVALID_TYPE', data: 'junk' }));
  });

  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('Received:', msg);
    if (msg.type === 'PONG') {
        console.log('✅ PONG received');
        ws.close();
    }
  });

  ws.on('close', () => console.log('WS Closed.'));
}

testWSRobust().catch(console.error);
