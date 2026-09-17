import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { MailService } from '../mail/mail.service';

/** How long a reset code stays valid after being requested. */
const RESET_CODE_TTL_MINUTES = 15;
/** Wrong guesses allowed before the code is burned. */
const RESET_CODE_MAX_ATTEMPTS = 5;
/** How long the token issued after a valid code can be used. */
const RESET_TOKEN_TTL = '10m';

/**
 * Always the same answer, whether or not the email exists, so this endpoint
 * can't be used to enumerate registered accounts.
 */
const GENERIC_RESET_MESSAGE =
  'Si el correo está registrado, te enviamos un código de verificación';

/** 6-digit code from a CSPRNG, so it can't be predicted from earlier codes. */
function generateResetCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, '0');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const valid = await this.usersService.validatePassword(user, password);
    if (!valid) return null;
    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    if (!user) throw new UnauthorizedException('Credenciales incorrectas');
    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const user = await this.usersService.create(dto);
    return this.generateTokens(user);
  }

  async getProfile(userId: string) {
    return this.usersService.findOne(userId);
  }

  /** Step 1: emails a 6-digit code to the user. */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: GENERIC_RESET_MESSAGE };
    }

    const code = generateResetCode();
    const codeHash = await bcrypt.hash(code, 10);

    await this.usersService.setResetCode(
      user.id,
      codeHash,
      new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
    );
    await this.mailService.sendPasswordResetCode(
      user.email,
      user.firstName,
      code,
      RESET_CODE_TTL_MINUTES,
    );

    return { message: GENERIC_RESET_MESSAGE };
  }

  /**
   * Step 2: checks the code and returns a short-lived token that authorises the
   * password change. The code is single use and burns after too many failures.
   */
  async verifyResetCode(email: string, code: string): Promise<{ resetToken: string }> {
    const invalidCode = new BadRequestException('El código es inválido o expiró');

    const user = await this.usersService.findByEmail(email);
    if (!user) throw invalidCode;

    const record = await this.usersService.findResetCode(user.id);
    if (!record?.resetCodeHash || !record.resetCodeExpiresAt) throw invalidCode;

    if (record.resetCodeExpiresAt.getTime() < Date.now()) {
      await this.usersService.clearResetCode(user.id);
      throw invalidCode;
    }

    if ((record.resetCodeAttempts ?? 0) >= RESET_CODE_MAX_ATTEMPTS) {
      await this.usersService.clearResetCode(user.id);
      throw new BadRequestException('Demasiados intentos fallidos. Pedí un código nuevo');
    }

    if (!(await bcrypt.compare(code, record.resetCodeHash))) {
      await this.usersService.countFailedResetAttempt(user.id);
      throw invalidCode;
    }

    // Valid code: drop it straight away so it can't be replayed.
    await this.usersService.clearResetCode(user.id);

    return {
      resetToken: this.jwtService.sign(
        { sub: user.id, email: user.email, purpose: 'password-reset' },
        { expiresIn: RESET_TOKEN_TTL },
      ),
    };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    if (payload.purpose !== 'password-reset') {
      throw new UnauthorizedException('Token inválido');
    }
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    await this.usersService.update(user.id, { password: newPassword });
    // A used/invalidated reset flow should never leave a live code behind.
    await this.usersService.clearResetCode(user.id);
    await this.mailService.sendPasswordChanged(user.email, user.firstName);
    return { message: 'Contraseña actualizada correctamente' };
  }

  private generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
    };
  }
}
