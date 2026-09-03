import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { RolesModule } from "./modules/roles/roles.module";
import { SettingsModule } from "./modules/settings/settings.module";
import { UploadModule } from "./modules/upload/upload.module";
import { OrganizationsModule } from "./modules/organizations/organizations.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { WorkersModule } from "./modules/workers/workers.module";
import { AttendanceModule } from "./modules/attendance/attendance.module";
import { WagesModule } from "./modules/wages/wages.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { CalendarModule } from "./modules/calendar/calendar.module";
import { SalesModule } from "./modules/sales/sales.module";
import { KharchiModule } from "./modules/kharchi/kharchi.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { MaterialsModule } from "./modules/materials/materials.module";
import { ExpensesModule } from "./modules/expenses/expenses.module";
import { ProgressModule } from "./modules/progress/progress.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { GalleryModule } from "./modules/gallery/gallery.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SettingsModule,
    UploadModule,
    OrganizationsModule,
    ProjectsModule,
    WorkersModule,
    CalendarModule,
    AttendanceModule,
    WagesModule,
    SubscriptionsModule,
    SalesModule,
    KharchiModule,
    NotificationsModule,
    MaterialsModule,
    ExpensesModule,
    ProgressModule,
    DashboardModule,
    GalleryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
