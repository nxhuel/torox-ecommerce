import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private readonly repo: Repository<Setting>,
  ) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const row = await this.repo.findOne({ where: { key } });
    return (row?.value as T) ?? null;
  }

  async set(key: string, value: unknown): Promise<Setting> {
    const existing = await this.repo.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create({ key, value }));
  }

  async remove(key: string): Promise<void> {
    await this.repo.delete({ key });
  }
}
