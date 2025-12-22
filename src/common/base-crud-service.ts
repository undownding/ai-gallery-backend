import {
  DataSource,
  DeepPartial,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  Repository
} from 'typeorm'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsInt, IsOptional } from 'class-validator'
import { BadRequestException } from '@nestjs/common'
import DataLoader from 'dataloader'
import { InjectDataSource } from '@nestjs/typeorm'

export type IDType = string // | number

export interface Paged<T> {
  count: number
  data: T[]
}

export class PagedDto {
  @ApiPropertyOptional({
    description: '页数，从0开始',
    example: 0
  })
  @IsOptional()
  @IsInt()
  page: number = 0

  @ApiPropertyOptional({
    description: '每页数量，默认20',
    example: 20
  })
  @IsOptional()
  @IsInt()
  limit: number = 20

  get skip(): number {
    return this.page * this.limit
  }
}

export class BaseCrudService<T extends { [key: string]: any }> {
  public readonly loader = new DataLoader<IDType, T>(async (ids) => {
    const entities = await this.listByIds(ids as IDType[])
    return ids.map((id) => entities.find((entity) => entity.id === id) || new Error('Not found'))
  })

  private _repository: Repository<T>
  protected get repository(): Repository<T> {
    if (this._repository) {
      return this._repository
    }
    return (this._repository = this.dataSource.getRepository(this.entityClass))
  }

  @InjectDataSource()
  protected readonly dataSource: DataSource

  protected constructor(protected readonly entityClass: EntityTarget<T>) {}

  public async getById(id: IDType): Promise<T | null> {
    return this.repository.findOneById(id)
  }

  public async listByIds(ids: IDType[]): Promise<T[]> {
    return this.repository.findByIds(ids)
  }

  public async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.repository.findOne(options)
  }

  public async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.repository.find(options)
  }

  public async findAll(): Promise<T[]> {
    return this.repository.find()
  }

  public async exists(options?: FindManyOptions<T>): Promise<boolean> {
    return this.repository.exist(options)
  }

  public async create(data: DeepPartial<T>): Promise<T> {
    return this.repository.save(this.repository.create(data as T))
  }

  public async search(
    where: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    skip = 0,
    limit = 20
  ): Promise<Paged<T>> {
    return this.repository
      .findAndCount({ where, skip, take: limit })
      .then(([data, count]) => ({ data, count }))
  }

  /**
   * @deprecated something wrong with this method
   */
  public async update(criteria: IDType | FindOptionsWhere<T>, data: Partial<T>): Promise<T> {
    this.loader.clearAll()
    return this.repository.update(criteria, data as object).then((response) => response.raw[0])
  }

  public async updateById(id: IDType, data: DeepPartial<T>): Promise<T> {
    const exists = await this.repository.findOneById(id)
    if (!exists) {
      throw new BadRequestException('No matching data found')
    }
    this.loader.clear(id)
    // 将更新数据合并到现有实体，以保持未修改字段的值
    const updatedEntity = this.repository.merge(exists, data)
    return this.repository.save(updatedEntity)
  }

  public merge(entity: T, data: DeepPartial<T>): T {
    return this.repository.merge(entity, data)
  }

  public async count(options?: FindManyOptions<T>): Promise<number> {
    return this.repository.count(options)
  }

  public async delete(criteria: FindOptionsWhere<T> | IDType): Promise<void> {
    const result = await this.repository.delete(criteria)
    if (result.affected === 0) {
      throw new BadRequestException('No data was deleted')
    }
    this.loader.clearAll()
  }

  public async softDelete(criteria: FindOptionsWhere<T> | IDType): Promise<void> {
    await this.repository.softDelete(criteria)
    this.loader.clearAll()
  }
}
