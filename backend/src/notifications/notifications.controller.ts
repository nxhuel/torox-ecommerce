import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationType } from './entities/notification.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  getMine(@CurrentUser() user: User) {
    return this.service.getForUser(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: User) {
    return this.service.unreadCount(user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.markRead(id, user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: User) {
    return this.service.markAllRead(user.id);
  }

  @Post('broadcast')
  @Roles('ADMIN')
  broadcast(@Body() dto: CreateNotificationDto) {
    return this.service.broadcastToCustomers(
      dto.type as NotificationType,
      dto.title,
      dto.message,
      dto.link,
    );
  }
}