import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./shared/filters/global-exception.filter";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";

function getAllowedCorsOrigins(config: ConfigService) {
  const nodeEnv = config.get<string>("app.nodeEnv") ?? "development";
  const publicWebUrl = config.get<string>("app.publicWebUrl") ?? "";
  const configuredOrigins = (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const developmentOrigins =
    nodeEnv === "production"
      ? []
      : ["http://localhost:3000", "http://127.0.0.1:3000"];

  return Array.from(new Set([publicWebUrl, ...configuredOrigins, ...developmentOrigins].filter(Boolean)));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: getAllowedCorsOrigins(config),
    credentials: true
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: {
        policy: "cross-origin"
      }
    })
  );
  app.setGlobalPrefix(config.get<string>("app.apiPrefix") ?? "api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = config.get<number>("app.port") ?? 4000;
  await app.listen(port);
}

void bootstrap();
