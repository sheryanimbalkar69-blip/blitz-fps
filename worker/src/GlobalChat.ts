// Global World Chat Durable Object for Project Blitz
import { ChatMessagePacket } from '../../shared/packets';

export class GlobalChat {
  private state: DurableObjectState;
  private env: any;
  private sessions: Set<WebSocket> = new Set();
  private recentMessages: ChatMessagePacket[] = [];

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [clientWs, serverWs] = Object.values(pair);

      serverWs.accept();
      this.sessions.add(serverWs);

      // Send recent message history and current online count
      serverWs.send(JSON.stringify({
        type: 'CHAT_HISTORY',
        messages: this.recentMessages.slice(-20),
        onlineCount: this.sessions.size + 10 // humans + active server bots
      }));

      this.broadcastOnlineCount();

      serverWs.addEventListener('message', async (msg) => {
        try {
          const data = JSON.parse(msg.data as string);
          if (data.type === 'CHAT') {
            const chatMsg: ChatMessagePacket = {
              id: crypto.randomUUID(),
              sender: String(data.sender || 'Soldier').slice(0, 20),
              senderTeam: data.senderTeam,
              text: String(data.text || '').slice(0, 150),
              timestamp: Date.now(),
              channel: 'WORLD'
            };

            this.recentMessages.push(chatMsg);
            if (this.recentMessages.length > 50) this.recentMessages.shift();

            this.broadcast({
              type: 'CHAT_BROADCAST',
              message: chatMsg
            });

            // Persist to D1
            if (this.env.DB) {
              await this.env.DB.prepare(
                `INSERT INTO global_chat_logs (id, sender, message, timestamp) VALUES (?, ?, ?, ?)`
              ).bind(chatMsg.id, chatMsg.sender, chatMsg.text, Math.floor(chatMsg.timestamp / 1000)).run();
            }
          }
        } catch (e) {
          // ignore
        }
      });

      serverWs.addEventListener('close', () => {
        this.sessions.delete(serverWs);
        this.broadcastOnlineCount();
      });

      return new Response(null, {
        status: 101,
        webSocket: clientWs
      });
    }

    return new Response('Blitz GlobalChat Active', { status: 200 });
  }

  private broadcastOnlineCount() {
    this.broadcast({
      type: 'ONLINE_COUNT',
      count: Math.max(12, this.sessions.size + 10)
    });
  }

  private broadcast(data: any) {
    const payload = JSON.stringify(data);
    for (const ws of this.sessions) {
      try {
        ws.send(payload);
      } catch (e) {
        this.sessions.delete(ws);
      }
    }
  }
}
