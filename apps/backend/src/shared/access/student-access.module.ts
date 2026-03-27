import { Global, Module } from "@nestjs/common";
import { StudentAccessService } from "./student-access.service";

@Global()
@Module({
  providers: [StudentAccessService],
  exports: [StudentAccessService]
})
export class StudentAccessModule {}
