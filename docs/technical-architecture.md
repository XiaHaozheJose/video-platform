# 影视平台技术架构文档

## 1. 技术栈选型

### 1.1 后端技术栈
- 主框架：NestJS 10.x
- 数据库和缓存：
  - PostgreSQL 14.x：主数据库，存储结构化数据
  - Redis 6.x：缓存层，存储热点数据
  - Elasticsearch 8.x：全文搜索引擎
- 消息队列：Bull：处理异步任务和定时任务
- 对象存储：阿里云OSS/AWS S3
- API文档：Swagger/OpenAPI
- 身份认证：JWT + Redis

### 1.2 开发工具和环境
- Node.js 18.x LTS
- TypeScript 5.x
- Docker & Docker Compose
- Git 版本控制
- ESLint + Prettier 代码规范
- Jest 单元测试

## 2. 系统架构

### 2.1 整体架构 