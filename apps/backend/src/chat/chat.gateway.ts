import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: process.env.FRONTEND_URL, credentials: true },
})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify<{ sub: string; role: string }>(
        token,
        {
          secret: process.env.JWT_ACCESS_SECRET,
        },
      );
      await client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  pushMessage(userId: string, message: unknown) {
    this.server.to(`user:${userId}`).emit('message:new', message);
  }
}
