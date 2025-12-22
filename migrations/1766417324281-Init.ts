import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1766417324281 implements MigrationInterface {
  name = 'Init1766417324281'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "githubId" text NOT NULL,
        "login" text NOT NULL,
        "name" text,
        "email" text,
        "avatarUrl" text,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "lastLoginAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "isCreator" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "users_email_unique" ON "users" ("email")
    `)
    await queryRunner.query(`
      CREATE UNIQUE INDEX "users_github_id_unique" ON "users" ("githubId")
    `)
    await queryRunner.query(`
      CREATE TABLE "upload" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(255) NOT NULL,
        "eTag" character varying(72),
        "size" integer,
        "url" character varying(512),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "userId" uuid,
        CONSTRAINT "PK_1fe8db121b3de4ddfa677fc51f3" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "article" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(255),
        "text" text NOT NULL,
        "isPublic" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "authorId" uuid NOT NULL,
        "thumbnailId" uuid,
        CONSTRAINT "REL_6829d39ee8b8a6f50429bea414" UNIQUE ("thumbnailId"),
        CONSTRAINT "PK_40808690eb7b915046558c0f81b" PRIMARY KEY ("id")
      )
    `)
    await queryRunner.query(`
      CREATE TABLE "article_media_assets" (
        "articleId" uuid NOT NULL,
        "uploadId" uuid NOT NULL,
        CONSTRAINT "PK_39c3970ec5e874c5815fda2f3ae" PRIMARY KEY ("articleId", "uploadId")
      )
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_04613a8908a39a91a7a153f311" ON "article_media_assets" ("articleId")
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_e26828809a9c30ccec1cb6358c" ON "article_media_assets" ("uploadId")
    `)
    await queryRunner.query(`
      CREATE TABLE "article_source_assets" (
        "articleId" uuid NOT NULL,
        "uploadId" uuid NOT NULL,
        CONSTRAINT "PK_3707209f11d7551fae4eb2231a8" PRIMARY KEY ("articleId", "uploadId")
      )
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_0de6fdaf86c897f1025349cb9d" ON "article_source_assets" ("articleId")
    `)
    await queryRunner.query(`
      CREATE INDEX "IDX_1be4c6c7a954493ab99f78d086" ON "article_source_assets" ("uploadId")
    `)
    await queryRunner.query(`
      ALTER TABLE "upload"
      ADD CONSTRAINT "FK_0acad24db01762fb1d5b51a70cd" FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `)
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD CONSTRAINT "FK_a9c5f4ec6cceb1604b4a3c84c87" FOREIGN KEY ("authorId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)
    await queryRunner.query(`
      ALTER TABLE "article"
      ADD CONSTRAINT "FK_6829d39ee8b8a6f50429bea4141" FOREIGN KEY ("thumbnailId") REFERENCES "upload"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `)
    await queryRunner.query(`
      ALTER TABLE "article_media_assets"
      ADD CONSTRAINT "FK_04613a8908a39a91a7a153f3110" FOREIGN KEY ("articleId") REFERENCES "article"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)
    await queryRunner.query(`
      ALTER TABLE "article_media_assets"
      ADD CONSTRAINT "FK_e26828809a9c30ccec1cb6358ce" FOREIGN KEY ("uploadId") REFERENCES "upload"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)
    await queryRunner.query(`
      ALTER TABLE "article_source_assets"
      ADD CONSTRAINT "FK_0de6fdaf86c897f1025349cb9d6" FOREIGN KEY ("articleId") REFERENCES "article"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)
    await queryRunner.query(`
      ALTER TABLE "article_source_assets"
      ADD CONSTRAINT "FK_1be4c6c7a954493ab99f78d0867" FOREIGN KEY ("uploadId") REFERENCES "upload"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "article_source_assets" DROP CONSTRAINT "FK_1be4c6c7a954493ab99f78d0867"
    `)
    await queryRunner.query(`
      ALTER TABLE "article_source_assets" DROP CONSTRAINT "FK_0de6fdaf86c897f1025349cb9d6"
    `)
    await queryRunner.query(`
      ALTER TABLE "article_media_assets" DROP CONSTRAINT "FK_e26828809a9c30ccec1cb6358ce"
    `)
    await queryRunner.query(`
      ALTER TABLE "article_media_assets" DROP CONSTRAINT "FK_04613a8908a39a91a7a153f3110"
    `)
    await queryRunner.query(`
      ALTER TABLE "article" DROP CONSTRAINT "FK_6829d39ee8b8a6f50429bea4141"
    `)
    await queryRunner.query(`
      ALTER TABLE "article" DROP CONSTRAINT "FK_a9c5f4ec6cceb1604b4a3c84c87"
    `)
    await queryRunner.query(`
      ALTER TABLE "upload" DROP CONSTRAINT "FK_0acad24db01762fb1d5b51a70cd"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."IDX_1be4c6c7a954493ab99f78d086"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."IDX_0de6fdaf86c897f1025349cb9d"
    `)
    await queryRunner.query(`
      DROP TABLE "article_source_assets"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."IDX_e26828809a9c30ccec1cb6358c"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."IDX_04613a8908a39a91a7a153f311"
    `)
    await queryRunner.query(`
      DROP TABLE "article_media_assets"
    `)
    await queryRunner.query(`
      DROP TABLE "article"
    `)
    await queryRunner.query(`
      DROP TABLE "upload"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."users_github_id_unique"
    `)
    await queryRunner.query(`
      DROP INDEX "public"."users_email_unique"
    `)
    await queryRunner.query(`
      DROP TABLE "users"
    `)
  }
}
