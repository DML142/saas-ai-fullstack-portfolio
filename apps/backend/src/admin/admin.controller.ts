import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { Role } from 'generated/prisma/enums';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import type { Request } from 'express';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid access token' })
@ApiForbiddenResponse({ description: 'Caller is not an admin' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'List users (paginated, optional email search)' })
  @ApiOkResponse({ description: 'Paginated user list' })
  listUsers(@Query() query: ListUsersQueryDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  @ApiOperation({
    summary: 'Get a single user with subscription + workspace count',
  })
  @ApiOkResponse({ description: 'User detail' })
  @ApiNotFoundResponse({ description: 'User not found' })
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: "Change a user's role (cannot change your own)" })
  @ApiOkResponse({ description: 'Updated user' })
  @ApiForbiddenResponse({
    description: 'Not an admin, or attempting to change your own role',
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  updateUserRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
  ) {
    const user = req.user as { userId: string; role: Role };
    return this.adminService.updateUserRole(user.userId, id, body.role);
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions (paginated)' })
  @ApiOkResponse({ description: 'Paginated subscription list' })
  listSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    return this.adminService.listSubscriptions(query);
  }

  @Post('subscriptions/:userId/cancel')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Cancel a user subscription at period end (via Stripe)',
  })
  @ApiOkResponse({
    description: 'Cancellation requested; DB syncs via webhook',
  })
  @ApiNotFoundResponse({ description: 'User has no subscription' })
  cancelSubscription(@Param('userId') userId: string) {
    return this.adminService.cancelSubscription(userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Platform statistics' })
  @ApiOkResponse({ description: 'Aggregate counts + signup series' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('queues')
  @ApiOperation({ summary: 'BullMQ queue job counts' })
  @ApiOkResponse({ description: 'Per-queue job counts' })
  getQueues() {
    return this.adminService.getQueues();
  }
}
