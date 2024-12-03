import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './shared/services/logger.service';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { join } from 'path';
import { Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const configService = app.get(ConfigService);
// 添加 CORS 配置
app.enableCors({
  origin: configService.get('CORS_ORIGINS'),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });

  // 配置静态文件服务
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 使用自定义logger
  const logger = app.get(LoggerService);
  app.useLogger(logger);

  // 全局前缀
  app.setGlobalPrefix('api');

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // 全局拦截器
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(logger),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger配置
  const config = new DocumentBuilder()
    .setTitle('视频平台 API')
    .setDescription(`
    ## 接口文档
    
    ### 快速开始
    1. 使用以下测试账号登录获取token:
       - 用户名: admin
       - 密码: 123456
       
    2. 或者直接使用以下开发token:
    \`\`\`
    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTcwOTI4MTYwMCwiZXhwIjoxNzQwODE3NjAwfQ.2vTUgbP983RvF2Ld-TJbZ_2Qh_HrD4C1yQqE_0zgego
    \`\`\`
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // 提供 JSON 格式文档的路由
  app.getHttpAdapter().get('/swagger-json', (req, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(document);
  });

  // 添加 Helmet 安全头
  app.use(helmet());
   // 添加请求限制
   app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 限制每个IP 100个请求
    })
  );

  // 配置 WebSocket
  app.useWebSocketAdapter(new IoAdapter(app));
  await app.listen(3000);
}
bootstrap();
