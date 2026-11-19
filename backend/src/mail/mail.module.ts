import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';

@Module({
  // Necesario para usar JwtAuthGuard en MailController (como en los demás módulos).
  imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
