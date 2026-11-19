import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole, UserStatus } from './entities/user.entity';

/**
 * Crea (o asciende) el usuario administrador al arrancar el backend.
 *
 * Sirve para bases nuevas (ej: la Postgres local del docker-compose), donde no
 * hay ningún admin y por lo tanto nadie puede entrar al panel.
 *
 *  - Si ADMIN_EMAIL no está definido → no hace nada.
 *  - Si el usuario no existe → lo crea con ADMIN_PASSWORD y rol ADMIN.
 *  - Si existe pero es CUSTOMER → lo pasa a ADMIN (no toca la contraseña).
 */
@Injectable()
export class AdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL')?.trim().toLowerCase();
    if (!email) return;

    try {
      const existing = await this.users.findOne({ where: { email } });
      if (existing) {
        if (existing.role !== UserRole.ADMIN) {
          existing.role = UserRole.ADMIN;
          await this.users.save(existing);
          this.logger.warn(`Usuario ${email} ascendido a ADMIN.`);
        }
        return;
      }

      const password = this.config.get<string>('ADMIN_PASSWORD');
      if (!password || password.length < 8) {
        this.logger.warn(
          `ADMIN_EMAIL=${email} no existe y ADMIN_PASSWORD falta o tiene menos de 8 caracteres: no se creó el admin.`,
        );
        return;
      }

      await this.users.save(
        this.users.create({
          email,
          password: await bcrypt.hash(password, 12),
          firstName: 'Admin',
          lastName: 'TOROX',
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
        }),
      );
      this.logger.warn(`Usuario administrador ${email} creado.`);
    } catch (error: any) {
      this.logger.error(`No se pudo crear el admin inicial: ${error?.message}`);
    }
  }
}
