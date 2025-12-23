import { MigrationInterface, QueryRunner } from 'typeorm'

export class DropDefaultArticleId1766508455412 implements MigrationInterface {
  name = 'DropDefaultArticleId1766508455412'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "article_media_assets" DROP CONSTRAINT "FK_04613a8908a39a91a7a153f3110"`
    )
    await queryRunner.query(
      `ALTER TABLE "article_source_assets" DROP CONSTRAINT "FK_0de6fdaf86c897f1025349cb9d6"`
    )
    await queryRunner.query(`ALTER TABLE "article" ALTER COLUMN "id" DROP DEFAULT`)
    await queryRunner.query(
      `ALTER TABLE "article_media_assets" ADD CONSTRAINT "FK_04613a8908a39a91a7a153f3110" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    )
    await queryRunner.query(
      `ALTER TABLE "article_source_assets" ADD CONSTRAINT "FK_0de6fdaf86c897f1025349cb9d6" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "article_source_assets" DROP CONSTRAINT "FK_0de6fdaf86c897f1025349cb9d6"`
    )
    await queryRunner.query(
      `ALTER TABLE "article_media_assets" DROP CONSTRAINT "FK_04613a8908a39a91a7a153f3110"`
    )
    await queryRunner.query(
      `ALTER TABLE "article" ALTER COLUMN "id" SET DEFAULT uuid_generate_v4()`
    )
    await queryRunner.query(
      `ALTER TABLE "article_source_assets" ADD CONSTRAINT "FK_0de6fdaf86c897f1025349cb9d6" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    )
    await queryRunner.query(
      `ALTER TABLE "article_media_assets" ADD CONSTRAINT "FK_04613a8908a39a91a7a153f3110" FOREIGN KEY ("articleId") REFERENCES "article"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    )
  }
}
