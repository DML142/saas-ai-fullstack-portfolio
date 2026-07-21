import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { ChatService } from './chat.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Role } from 'generated/prisma/enums';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('workspaces')
  listWorkspaces(@Req() req: Request) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.listWorkspaces(user.userId);
  }

  @Post('workspaces')
  postWorkspace(@Req() req: Request, @Body() body: CreateWorkspaceDto) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.postWorkspace(user.userId, body.name);
  }

  @Get('workspaces/:id/messages')
  getMessages(@Req() req: Request, @Param('id') workspaceId: string) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.getMessages(user.userId, workspaceId);
  }

  @Post('workspaces/:id/messages')
  sendMesseage(
    @Req() req: Request,
    @Param('id') workspaceId: string,
    @Body() body: SendMessageDto,
  ) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.sendMessage(user.userId, workspaceId, body.content);
  }
}
