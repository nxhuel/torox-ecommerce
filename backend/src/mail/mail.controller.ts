import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MailService } from './mail.service';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MailController {
  constructor(private readonly mail: MailService) {}

  /** Manda un mail de prueba al admin logueado y devuelve lo que respondió Resend. */
  @Post('test')
  test(@CurrentUser() user: { email: string }) {
    return this.mail.sendTest(user.email);
  }
}
