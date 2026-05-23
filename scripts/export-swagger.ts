import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

type AppEntry = {
  name: string;
  modulePath: string;
};

const APPS: AppEntry[] = [
  { name: 'gateway', modulePath: '../apps/gateway/src/app.module' },
  { name: 'identity-service', modulePath: '../apps/identity-service/src/app.module' },
  { name: 'commerce-service', modulePath: '../apps/commerce-service/src/app.module' },
  { name: 'operation-service', modulePath: '../apps/operation-service/src/app.module' },
  { name: 'reporting-setting-service', modulePath: '../apps/reporting-setting-service/src/app.module' },
  { name: 'notification-service', modulePath: '../apps/notification-service/src/app.module' },
];

const outputDir = join(process.cwd(), '..', 'docs', 'swagger');

async function exportOne(appEntry: AppEntry) {
  const loaded = await import(appEntry.modulePath);
  const AppModule = loaded.AppModule;
  if (!AppModule) {
    throw new Error(`Cannot load AppModule from ${appEntry.modulePath}`);
  }

  const app = await NestFactory.create(AppModule, { logger: false });
  const config = new DocumentBuilder()
    .setTitle(`${appEntry.name} API`)
    .setDescription(`OpenAPI spec for ${appEntry.name}`)
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  const filePath = join(outputDir, `${appEntry.name}.openapi.json`);
  writeFileSync(filePath, JSON.stringify(doc, null, 2), 'utf-8');
  await app.close();
  return filePath;
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  const written: string[] = [];

  for (const appEntry of APPS) {
    const filePath = await exportOne(appEntry);
    written.push(filePath);
  }

  const indexPath = join(outputDir, 'README.md');
  const lines = [
    '# Swagger Exports',
    '',
    'Generated OpenAPI JSON files:',
    '',
    ...written.map((p) => `- ${p.replace(/\\/g, '/')}`),
    '',
    'Regenerate:',
    '',
    '```bash',
    'cd BE_Pharmacy',
    'npx ts-node -r tsconfig-paths/register scripts/export-swagger.ts',
    '```',
    '',
  ];
  writeFileSync(indexPath, lines.join('\n'), 'utf-8');
  // eslint-disable-next-line no-console
  console.log(`Exported ${written.length} swagger docs to ${outputDir}`);
}

void main();

