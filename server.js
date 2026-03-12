const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const { Client } = require('ssh2');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.static(path.join(__dirname, 'public')));

// SSH server configurations
const SSH_SERVERS = {
  'hardfought-us': {
    name: 'Hardfought (US)',
    host: 'us.hardfought.org',
    port: 22,
    username: 'nethack',
    tryKeyboard: true,
  },
  'hardfought-eu': {
    name: 'Hardfought (EU)',
    host: 'eu.hardfought.org',
    port: 22,
    username: 'nethack',
    tryKeyboard: true,
  },
  'hardfought-au': {
    name: 'Hardfought (AU)',
    host: 'au.hardfought.org',
    port: 22,
    username: 'nethack',
    tryKeyboard: true,
  },
  nao: {
    name: 'nethack.alt.org',
    host: 'nethack.alt.org',
    port: 22,
    username: 'nethack',
    tryKeyboard: true,
  },
};

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  let ssh = null;
  let stream = null;
  let pendingSize = { cols: 133, rows: 36 };
  let connected = false;

  // Send available servers to client
  ws.send(JSON.stringify({
    type: 'servers',
    servers: Object.entries(SSH_SERVERS).map(([id, s]) => ({ id, name: s.name })),
  }));

  function connectSSH(serverId) {
    const config = SSH_SERVERS[serverId];
    if (!config) {
      ws.send(JSON.stringify({ type: 'status', status: 'error', message: `Unknown server: ${serverId}` }));
      return;
    }

    // Clean up existing connection if any
    if (stream) { try { stream.close(); } catch (e) {} stream = null; }
    if (ssh) { try { ssh.end(); } catch (e) {} }

    ssh = new Client();
    connected = false;

    ssh.on('ready', () => {
      console.log(`SSH connected to ${config.name}`);
      connected = true;
      ws.send(JSON.stringify({ type: 'status', status: 'connected', server: serverId }));

      ssh.shell({ term: 'xterm-256color', cols: pendingSize.cols, rows: pendingSize.rows }, (err, s) => {
        if (err) {
          ws.send(JSON.stringify({ type: 'status', status: 'error', message: err.message }));
          return;
        }
        stream = s;

        stream.on('data', (data) => {
          if (ws.readyState === 1) {
            ws.send(data);
          }
        });

        stream.on('close', () => {
          console.log('SSH stream closed');
          stream = null;
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
          }
        });

        stream.stderr.on('data', (data) => {
          console.error('SSH stderr:', data.toString());
        });
      });
    });

    ssh.on('error', (err) => {
      console.error('SSH error:', err.message, err.level, err.description);
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'status', status: 'error', message: err.message }));
      }
    });

    ssh.on('close', () => {
      console.log('SSH connection closed (hadError:', connected, ')');
      connected = false;
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'status', status: 'disconnected' }));
      }
    });

    ssh.on('handshake', (negotiated) => {
      console.log('SSH handshake completed:', JSON.stringify(negotiated).substring(0, 200));
    });

    ssh.on('keyboard-interactive', (name, instructions, lang, prompts, finish) => {
      finish([]);
    });

    console.log(`Connecting to ${config.name} (${config.host}:${config.port})...`);
    ssh.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      tryKeyboard: config.tryKeyboard,
      readyTimeout: 10000,
      hostVerifier: () => true, // Public game servers, no key verification needed
    });
  }

  ws.on('message', (data) => {
    // Check if it's a JSON control message
    try {
      const str = data.toString();
      const msg = JSON.parse(str);
      console.log('Client message:', msg.type, msg.server || '');
      if (msg.type === 'resize') {
        const cols = Math.max(msg.cols || 133, 80);
        const rows = Math.max(msg.rows || 33, 24);
        if (stream) {
          stream.setWindow(rows, cols, 0, 0);
        } else {
          pendingSize.cols = cols;
          pendingSize.rows = rows;
        }
        return;
      }
      if (msg.type === 'connect') {
        connectSSH(msg.server || 'hardfought');
        return;
      }
    } catch (e) {
      // Not JSON — raw terminal input, forward to SSH
    }

    if (stream && stream.writable) {
      stream.write(data);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    if (stream) { try { stream.close(); } catch (e) {} }
    if (ssh) { try { ssh.end(); } catch (e) {} }
  });

  // Auto-connect to hardfought US by default
  connectSSH('hardfought-us');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`NetHack HUD server running on http://localhost:${PORT}`);
});
