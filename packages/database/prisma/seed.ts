import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from '../generated/prisma';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import {
  DEFAULT_APP_NAME,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
} from '@nirman-app/shared';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
}

const adapter = new PrismaMariaDb(databaseUrl);
const prisma = new PrismaClient({ adapter });

const DEFAULT_SETTINGS = [
  { key: 'general.appName', value: DEFAULT_APP_NAME },
  { key: 'general.companyName', value: '' },
  { key: 'general.lightLogo', value: '' },
  { key: 'general.darkLogo', value: '' },
  { key: 'general.favicon', value: '' },
  { key: 'general.supportEmail', value: '' },
  { key: 'general.supportPhone', value: '' },
  { key: 'general.companyAddress', value: '' },
  { key: 'email.smtpHost', value: '' },
  { key: 'email.smtpPort', value: '' },
  { key: 'email.smtpUsername', value: '' },
  { key: 'email.smtpPassword', value: '' },
  { key: 'email.smtpEncryption', value: '' },
  { key: 'email.mailFromAddress', value: '' },
  { key: 'email.mailFromName', value: '' },
];

async function main() {
  await prisma.$transaction(async (tx) => {
    const superAdminRole = await tx.role.upsert({
      where: { name: 'Super Admin' },
      update: {
        description: 'Full system access',
        isSystem: true,
      },
      create: {
        name: 'Super Admin',
        description: 'Full system access',
        isSystem: true,
      },
    });

    const userManagerRole = await tx.role.upsert({
      where: { name: 'User Manager' },
      update: {
        description: 'Can manage users and view roles/settings',
        isSystem: true,
      },
      create: {
        name: 'User Manager',
        description: 'Can manage users and view roles/settings',
        isSystem: true,
      },
    });

    await tx.role.upsert({
      where: { name: 'Member' },
      update: {
        description: 'Default authenticated member',
        isSystem: true,
      },
      create: {
        name: 'Member',
        description: 'Default authenticated member',
        isSystem: true,
      },
    });

    for (const resource of PERMISSION_RESOURCES) {
      for (const action of PERMISSION_ACTIONS) {
        await tx.permission.upsert({
          where: {
            resource_action_roleId: {
              resource,
              action,
              roleId: superAdminRole.id,
            },
          },
          update: {},
          create: { resource, action, roleId: superAdminRole.id },
        });
      }
    }

    const userManagerPermissions = [
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'roles', action: 'read' },
      { resource: 'settings', action: 'read' },
    ] as const;

    for (const { resource, action } of userManagerPermissions) {
      await tx.permission.upsert({
        where: {
          resource_action_roleId: {
            resource,
            action,
            roleId: userManagerRole.id,
          },
        },
        update: {},
        create: { resource, action, roleId: userManagerRole.id },
      });
    }

    for (const setting of DEFAULT_SETTINGS) {
      await tx.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.local';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    await tx.user.upsert({
      where: { email: adminEmail },
      update: {
        name: 'System Administrator',
        password: hashedPassword,
        isActive: true,
        roleId: superAdminRole.id,
      },
      create: {
        name: 'System Administrator',
        email: adminEmail,
        password: hashedPassword,
        isActive: true,
        roleId: superAdminRole.id,
      },
    });
  });

  console.log('Seeded generic roles, permissions, settings, and admin user.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
