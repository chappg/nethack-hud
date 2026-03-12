// terminal.js — xterm.js initialization and WebSocket bridge
const TerminalManager = (() => {
  let term = null;
  let fitAddon = null;
  let ws = null;
  let onDataCallback = null;
  let onStatusCallback = null;

  function init(container) {
    term = new Terminal({
      cursorBlink: true,
      cols: 80,  // Will be resized from cookie/default after open
      rows: 24,
      fontSize: 15,
      fontFamily: "'Menlo', 'Consolas', 'DejaVu Sans Mono', monospace",
      theme: {
        background: '#0a0a0f',
        foreground: '#c8c8d0',
        cursor: '#33ff88',
        cursorAccent: '#0a0a0f',
        selectionBackground: '#33ff8844',
        black: '#0a0a0f',
        red: '#ff3344',
        green: '#33ff88',
        yellow: '#ffaa22',
        blue: '#4488ff',
        magenta: '#cc44ff',
        cyan: '#44ddff',
        white: '#c8c8d0',
        brightBlack: '#666680',
        brightRed: '#ff6677',
        brightGreen: '#66ffaa',
        brightYellow: '#ffcc44',
        brightBlue: '#66aaff',
        brightMagenta: '#dd66ff',
        brightCyan: '#66eeff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
      scrollback: 1000,
    });

    term.open(container);

    // Key handling for NetHack:
    // - Ctrl+key → sends raw control character (Ctrl-D = \x04 = kick, etc.)
    //   xterm.js handles Ctrl+key natively, so we just let it through
    // - Cmd+key (Mac Meta) → send as Meta/ESC sequence for NetHack extended commands
    // - Alt+1/2/? → HUD shortcuts (don't send to terminal)
    term.attachCustomKeyEventHandler((e) => {
      // Only handle keydown (not keyup)
      if (e.type !== 'keydown') return true;

      // Let Alt+1/2/? through for HUD shortcuts (don't send to terminal)
      if (e.altKey && ['1', '2', '/', '?'].includes(e.key)) return false;

      // Ctrl+key: let xterm.js handle natively — it sends correct control chars
      // Ctrl-A=\x01, Ctrl-D=\x04 (kick), Ctrl-P=\x10, Ctrl-T=\x14, etc.
      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        // Only intercept browser shortcuts we want to keep: Ctrl+C (copy), Ctrl+V (paste)
        const browserKeys = ['c', 'v'];
        if (browserKeys.includes(key)) return true; // let browser handle copy/paste
        // Everything else: let xterm.js send as control character
        return true;
      }

      // Cmd (Mac Meta) — intercept and send as Meta/ESC sequence
      // NetHack interprets ESC+char as extended command shortcuts
      if (e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase();
        // Allow browser shortcuts: Cmd+C, Cmd+V, Cmd+X, Cmd+T, Cmd+W, Cmd+R, Cmd+Q, Cmd+N, Cmd+A, Cmd+Z, Cmd+F
        const browserKeys = ['c', 'v', 'x', 't', 'w', 'r', 'q', 'n', 'a', 'z', 'f'];
        if (browserKeys.includes(key)) return true; // let browser handle

        // For everything else (Cmd+P for #pray, Cmd+L for #loot, etc.),
        // send as Meta key (ESC + char)
        if (key.length === 1 && key >= 'a' && key <= 'z') {
          e.preventDefault();
          e.stopPropagation();
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send('\x1b' + key);
          }
          return false;
        }
      }

      return true; // default handling
    });

    // Forward keyboard input IMMEDIATELY to WebSocket — zero delay
    term.onData((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    term.onBinary((data) => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
        ws.send(bytes);
      }
    });

    // Resize handling
    // Size controls — load from cookie or default 133x36
    const savedSize = getTerminalSize();
    if (savedSize.cols !== term.cols || savedSize.rows !== term.rows) {
      term.resize(savedSize.cols, savedSize.rows);
    }
    setupSizeControls();

    return term;
  }

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);
    ws.binaryType = 'arraybuffer';

    if (onStatusCallback) onStatusCallback('connecting');

    ws.onopen = () => {
      if (onStatusCallback) onStatusCallback('connecting');
      hideReconnectOverlay();
      // Send initial size
      ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'status') {
            if (onStatusCallback) onStatusCallback(msg.status, msg.server);
            return;
          }
          if (msg.type === 'servers') {
            // Populate server select dropdown
            const sel = document.getElementById('server-select');
            if (sel && msg.servers) {
              sel.innerHTML = msg.servers.map(s =>
                `<option value="${s.id}">${s.name}</option>`
              ).join('');
              // Restore saved selection
              const saved = localStorage.getItem('nh_server');
              if (saved) sel.value = saved;
            }
            // Auto-connect to selected/default server
            const serverId = (sel && sel.value) || localStorage.getItem('nh_server') || 'hardfought-us';
            switchServer(serverId);
            return;
          }
        } catch (e) {}
        term.write(event.data);
      } else {
        term.write(new Uint8Array(event.data));
      }
    };

    ws.onclose = () => {
      if (onStatusCallback) onStatusCallback('disconnected');
      term.write('\r\n\x1b[31m--- Connection closed ---\x1b[0m\r\n');
      term.write('\x1b[33mReconnecting in 3 seconds... (or click Reconnect button)\x1b[0m\r\n');
      showReconnectOverlay();
      // Reconnect after 3s
      setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      if (onStatusCallback) onStatusCallback('error');
    };
  }

  function getTerminalSize() {
    try {
      const cookie = document.cookie.split(';').find(c => c.trim().startsWith('nhterm_size='));
      if (cookie) {
        const val = cookie.split('=')[1];
        const [cols, rows] = val.split('x').map(Number);
        if (cols >= 80 && rows >= 24) return { cols, rows };
      }
    } catch (e) {}
    return { cols: 133, rows: 36 };
  }

  function saveTerminalSize(cols, rows) {
    document.cookie = `nhterm_size=${cols}x${rows}; max-age=31536000; path=/`;
  }

  function resizeTo(cols, rows) {
    cols = Math.max(cols, 80);
    rows = Math.max(rows, 24);
    term.resize(cols, rows);
    saveTerminalSize(cols, rows);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }));
    }
    // Update active button state
    document.querySelectorAll('.size-controls .panel-toggle').forEach(b => b.classList.remove('size-active'));
    if (cols === 80 && rows === 24) {
      document.getElementById('size-80x24').classList.add('size-active');
    } else if (cols === 133 && rows === 36) {
      document.getElementById('size-default').classList.add('size-active');
    } else {
      document.getElementById('size-custom-btn').classList.add('size-active');
    }
  }

  function setupSizeControls() {
    document.getElementById('size-80x24').addEventListener('click', () => {
      document.getElementById('size-custom-inputs').style.display = 'none';
      resizeTo(80, 24);
    });
    document.getElementById('size-default').addEventListener('click', () => {
      document.getElementById('size-custom-inputs').style.display = 'none';
      resizeTo(133, 36);
    });
    document.getElementById('size-custom-btn').addEventListener('click', () => {
      const inputs = document.getElementById('size-custom-inputs');
      inputs.style.display = inputs.style.display === 'none' ? 'inline' : 'none';
      const saved = getTerminalSize();
      document.getElementById('size-cols').value = saved.cols;
      document.getElementById('size-rows').value = saved.rows;
    });
    document.getElementById('size-apply').addEventListener('click', () => {
      const cols = parseInt(document.getElementById('size-cols').value) || 133;
      const rows = parseInt(document.getElementById('size-rows').value) || 36;
      resizeTo(cols, rows);
    });

    // Highlight current size button
    const saved = getTerminalSize();
    if (saved.cols === 80 && saved.rows === 24) {
      document.getElementById('size-80x24').classList.add('size-active');
      document.getElementById('size-default').classList.remove('size-active');
    }
  }

  function showReconnectOverlay() {
    let overlay = document.getElementById('reconnect-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'reconnect-overlay';
      overlay.innerHTML = `
        <div class="reconnect-content">
          <div style="font-size:24px;margin-bottom:8px;">⚡</div>
          <div>Connection Lost</div>
          <button id="reconnect-btn" style="margin-top:12px;padding:8px 20px;background:var(--accent);color:#000;border:none;border-radius:4px;cursor:pointer;font-weight:bold;">Reconnect Now</button>
        </div>
      `;
      overlay.style.cssText = 'position:absolute;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:50;color:var(--text);font-size:14px;text-align:center;';
      document.getElementById('terminal-wrapper').style.position = 'relative';
      document.getElementById('terminal-wrapper').appendChild(overlay);
      document.getElementById('reconnect-btn').addEventListener('click', () => {
        hideReconnectOverlay();
        connect();
      });
    }
    overlay.style.display = 'flex';
  }

  function hideReconnectOverlay() {
    const overlay = document.getElementById('reconnect-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function switchServer(serverId) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      localStorage.setItem('nh_server', serverId);
      term.clear();
      term.write(`\x1b[33mConnecting to ${serverId}...\x1b[0m\r\n`);
      ws.send(JSON.stringify({ type: 'connect', server: serverId }));
    }
  }

  // Send raw string to the SSH session via WebSocket
  function sendKeys(str) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(str);
    }
  }

  return {
    init,
    connect,
    getTerminal: () => term,
    onStatus: (cb) => { onStatusCallback = cb; },
    resizeTo,
    switchServer,
    sendKeys,
  };
})();
