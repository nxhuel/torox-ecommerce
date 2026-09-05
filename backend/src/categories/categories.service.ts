import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<Category> {
    const slug = dto.slug || this.generateSlug(dto.name);
    const existing = await this.repo.findOne({ where: { slug } });
    if (existing) throw new ConflictException('Ya existe una categoría con ese slug');

    const category = this.repo.create({ ...dto, slug });
    return this.repo.save(category);
  }

  async findAll(activeOnly = false): Promise<Category[]> {
    const where = activeOnly ? { isActive: true, parentId: IsNull() } : { parentId: IsNull() };
    return this.repo.find({
      where: where as any,
      relations: { children: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Category> {
    const cat = await this.repo.findOne({ where: { id }, relations: { children: true, parent: true } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async findBySlug(slug: string): Promise<Category> {
    const cat = await this.repo.findOne({ where: { slug }, relations: { children: true, parent: true } });
    if (!cat) throw new NotFoundException('Categoría no encontrada');
    return cat;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.findOne(id);
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: string): Promise<void> {
    const cat = await this.findOne(id);
    await this.repo.remove(cat);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
