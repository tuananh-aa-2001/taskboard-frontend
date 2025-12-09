class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscriptions = {};
    this.isConnected = false;
    this.username = null;
  }

  connect(username, onConnected, onError) {
    this.username = username;
    this.ws = new WebSocket("ws://localhost:8080/ws/websocket");
    this.ws.onopen = () => {
      const connectFrame = `CONNECT\naccept-version:1.1,1.0\nheart-beat:10000,10000\n\n\x00`;
      this.ws.send(connectFrame);
    };

    this.ws.onmessage = (event) => {
      const message = event.data;
      if (message.startsWith("CONNECTED")) {
        this.isConnected = true;
        if (onConnected) onConnected();
      } else if (message.startsWith("MESSAGE")) {
        this.handleStompMessage(message);
      }
    };
    this.ws.onerror = (error) => {
      this.isConnected = false;
      if (onError) onError(error);
    };

    this.ws.onclose = () => {
      this.isConnected = false;
    };
  }

  subscribe(destination, callback) {
    const subscriptionId = `sub-${Date.now()}-${Math.random()}`;
    this.subscriptions[destination] = callback;
    const subscribeFrame = `SUBSCRIBE\nid:${subscriptionId}\ndestination:${destination}\n\n\x00`;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(subscribeFrame);
    }
  }

  handleStompMessage(message) {
    const lines = message.split("\n");
    let destination = "";
    let body = "";
    let inBody = false;

    for (let line of lines) {
      if (line.startsWith("destination:")) {
        destination = line.substring(12);
      }
      if (inBody) {
        body += line;
      }
      if (line === "") {
        inBody = true;
      }
    }

    // Avoid regex literal with control chars (ESLint error); use RegExp constructor
    body = body.replace(new RegExp('\\x00', 'g'), "");

    if (destination && this.subscriptions[destination]) {
      try {
        const data = JSON.parse(body);
        this.subscriptions[destination](data);
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    }
  }

  send(destination, body) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const message = `SEND\ndestination:${destination}\ncontent-length:${bodyStr.length}\n\n${bodyStr}\x00`;
    this.ws.send(message);
    return true;
  }

  disconnect() {
    if (this.ws && this.username) {
      this.send("/app/user.leave", this.username);
      // Give time for the message to be sent before closing
      setTimeout(() => {
        if (this.ws) {
          this.ws.close();
        }
      }, 100);
    } else if (this.ws) {
      this.ws.close();
    }
    this.isConnected = false;
    this.subscriptions = {};
  }
  getConnectionStatus() {
    return this.isConnected;
  }
}

const wsService = new WebSocketService();
export default wsService ;
