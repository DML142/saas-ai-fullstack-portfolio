import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { ChatService } from './chat.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { Role } from 'generated/prisma/enums';
import { updateWorkspaceDto } from './dto/update_workspace.dto';
import { UsageLimitGuard } from './guards/usage-limit.guard';
import { ImportWorkspaceDto } from './dto/import-workspace.dto';

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

  @Patch('workspaces/:id')
  renameWorkspace(
    @Req() req: Request,
    @Param('id') workpaceId: string,
    @Body() body: updateWorkspaceDto,
  ) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.renameWorkspace(user.userId, workpaceId, body.name);
  }

  @Delete('workspaces/:id')
  deleteWorkspace(@Req() req: Request, @Param('id') workspaceId: string) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.deleteWorkspace(user.userId, workspaceId);
  }

  @Get('workspaces/:id/messages')
  getMessages(@Req() req: Request, @Param('id') workspaceId: string) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.getMessages(user.userId, workspaceId);
  }

  @ApiOperation({
    summary: 'Get current usage',
    description:
      "Returns the caller's message count for the current calendar month, " +
      "their effective tier, and that tier's monthly limit (null for ULTRA).",
  })
  @Get('usage')
  getUsage(@Req() req: Request) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.getUsage(user.userId);
  }

  @UseGuards(UsageLimitGuard)
  @ApiForbiddenResponse({
    description:
      "Monthly message quota reached for the caller's tier — response body " +
      'includes { message, tier, limit, used } for an "upgrade to send more" UI.',
  })
  @Post('workspaces/:id/messages')
  sendMesseage(
    @Req() req: Request,
    @Param('id') workspaceId: string,
    @Body() body: SendMessageDto,
  ) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.sendMessage(user.userId, workspaceId, body.content);
  }

  @ApiOperation({
    summary: 'Export a workspace',
    description:
      "Returns the caller's workspace (must own it) serialized as a " +
      'versioned JSON document — name, export timestamp, and every ' +
      "message in that workspace's history, in chronological order.",
  })
  @ApiOkResponse({
    description: 'The exported workspace document',
    schema: {
      example: {
        version: 1,
        name: 'New chat',
        exportedAt: '2026-08-03T12:00:00.000Z',
        messages: [
          {
            role: 'USER',
            content: 'Hello',
            createdAt: '2026-08-01T10:00:00.000Z',
          },
          {
            role: 'ASSISTANT',
            content: 'Hi there!',
            createdAt: '2026-08-01T10:00:05.000Z',
          },
        ],
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Workspace does not exist or belongs to another user',
  })
  @Get('workspaces/:id/export')
  exportWorkspace(@Req() req: Request, @Param('id') workspaceId: string) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.exportWorkspace(user.userId, workspaceId);
  }

  @ApiOperation({
    summary: 'Import a previously exported workspace',
    description:
      'Creates a new workspace owned by the caller from an exported ' +
      'JSON document, recreating every message it contains. Imported ' +
      'messages do not count against the monthly send quota and do not ' +
      'trigger simulated replies.',
  })
  @ApiOkResponse({ description: 'The newly created workspace' })
  @ApiBadRequestResponse({
    description:
      'Unrecognized format version, a missing required field, or a ' +
      'message count/content length beyond the configured maximum',
  })
  @Post('workspaces/import')
  importWorkspace(@Req() req: Request, @Body() body: ImportWorkspaceDto) {
    const user = req.user as { userId: string; role: Role };
    return this.chatService.importWorkspace(user.userId, body);
  }
}
