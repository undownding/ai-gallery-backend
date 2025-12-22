<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://raw.githubusercontent.com/dung204/bunest/refs/heads/main/assets/bunest-icon.svg" width="360" alt="Nest Logo" /></a>
</p>

## Description

[Nest](https://github.com/nestjs/nest) 项目模板，使用 [Bun](https://bun.sh/) 作为运行时环境。

使用 `bun:s3` 作为原生的 S3 客户端，替代 `@aws-sdk/client-s3`。

使用 bun 原生测试框架，并使用 [pg-mem](https://github.com/oguimbal/pg-mem) 模拟 PostgreSQL 数据库进行单元测试。

使用 bun 原生的 redis 客户端接管 `cache-manager` 中的 io 读写。

## Project setup

```bash
$ bun install
```

## Compile and run the project

```bash
# development
$ bun start

# watch mode
$ bun start:dev

# build production bundle
$ bun build:prod

# production mode
$ bun start:prod
```

## Run tests

```bash
# unit tests
$ bun test

# test coverage
$ bun test:cov
```

## Deployment

使用 `nest g mo <module-name>` 命令生成模块后，接着开发对应的控制器和服务。


## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
