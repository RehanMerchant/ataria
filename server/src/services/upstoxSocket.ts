import WebSocket, { type RawData } from 'ws';
import protobuf from 'protobufjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EventEmitter } from 'events';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class UpstoxSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private root: protobuf.Root | null = null;
  private FeedResponse: protobuf.Type | null = null;
  private isConnected: boolean = false;

  public async connect(accessToken: string): Promise<void> {
    if (!this.root) {
      const protoPath = path.resolve(__dirname, '../../MarketDataFeed.proto');
      this.root = await protobuf.load(protoPath);
     this.FeedResponse = this.root.lookupType("com.upstox.marketdatafeederv3udapi.rpc.proto.FeedResponse");
    }

    const wssUrl = "wss://api.upstox.com/v3/feed/market-data-feed";

    this.ws = new WebSocket(wssUrl, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "*/*"
      },
      followRedirects: true
    });

    this.ws.on('open', () => {
      console.log('✅ Upstox WebSocket Connected');
      this.isConnected = true;
      this.emit('connected'); // Notify gateway to resubscribe active rooms if needed
    });

    this.ws.on('message', (data: RawData) => {
      try {
        if (!this.FeedResponse) return;
        const decodedData = this.FeedResponse.decode(data as Buffer);
        const jsonData = this.FeedResponse.toObject(decodedData, {
          longs: String, enums: String, bytes: String,
        });

        // Emit parsed ticks to the rest of our Node backend
        if (jsonData.type === 'live_feed' && jsonData.feeds) {
          this.emit('market_tick', jsonData.feeds);
        }
      } catch (error) {
         console.error('❌ Protobuf decode error:', error);
      }
    });

    this.ws.on('close', () => {
      console.log('⚠️ Upstox WebSocket Disconnected. Reconnecting...');
      this.isConnected = false;
      setTimeout(() => this.connect(accessToken), 5000);
    });
  }

public subscribe(instrumentKeys: string[]): void {
    if (!this.isConnected || !this.ws || instrumentKeys.length === 0) return;
    
    const payload = Buffer.from(JSON.stringify({
      guid: "sub_" + Date.now(),
      method: "sub",
      // CHANGE HERE: Update mode from "full" to "ltpc"
      data: { mode: "ltpc", instrumentKeys } 
    }));
    
    this.ws.send(payload);
    console.log(`📡 Upstox SUB: ${instrumentKeys.length} instruments (Mode: ltpc)`);
  }
  public unsubscribe(instrumentKeys: string[]): void {
    if (!this.isConnected || !this.ws || instrumentKeys.length === 0) return;
    
    const payload = Buffer.from(JSON.stringify({
      guid: "unsub_" + Date.now(),
      method: "unsub",
      data: { instrumentKeys }
    }));
    this.ws.send(payload);
    console.log(`🛑 Upstox UNSUB: ${instrumentKeys.length} instruments`);
  }
}

export const upstoxStream = new UpstoxSocketService();