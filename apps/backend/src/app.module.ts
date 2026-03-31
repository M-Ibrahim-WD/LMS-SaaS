import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppConfigModule } from "./config/app-config.module";
import { appConfig } from "./config/app.config";
import { AssessmentsModule } from "./modules/assessments/assessments.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CertificatesModule } from "./modules/certificates/certificates.module";
import { CommunicationsModule } from "./modules/communications/communications.module";
import { CoursesModule } from "./modules/courses/courses.module";
import { EnrollmentsModule } from "./modules/enrollments/enrollments.module";
import { InstructorModule } from "./modules/instructor/instructor.module";
import { LessonsModule } from "./modules/lessons/lessons.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { PaymentMethodsModule } from "./modules/payment-methods/payment-methods.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlansModule } from "./modules/plans/plans.module";
import { SectionsModule } from "./modules/sections/sections.module";
import { StudentInstructorsModule } from "./modules/student-instructors/student-instructors.module";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { StudentAccessModule } from "./shared/access/student-access.module";
import { PrismaModule } from "./shared/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig]
    }),
    AppConfigModule,
    PrismaModule,
    StudentAccessModule,
    AdminModule,
    AssessmentsModule,
    CertificatesModule,
    CommunicationsModule,
    NotificationsModule,
    PlansModule,
    ReviewsModule,
    SubscriptionsModule,
    AuthModule,
    UsersModule,
    TenantsModule,
    CoursesModule,
    InstructorModule,
    PaymentMethodsModule,
    PaymentsModule,
    StudentInstructorsModule,
    SectionsModule,
    LessonsModule,
    EnrollmentsModule
  ]
})
export class AppModule {}
