import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { JoinStudentInstructorDto } from "../dto/join-student-instructor.dto";
import { StudentInstructorsService } from "../services/student-instructors.service";

@Controller("student/instructors")
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentInstructorsController {
  constructor(private readonly studentInstructorsService: StudentInstructorsService) {}

  @Roles("STUDENT")
  @Post("join")
  join(@CurrentUser() user: JwtPayload, @Body() dto: JoinStudentInstructorDto) {
    return this.studentInstructorsService.createRelationFromInviteCode(user.sub, dto.inviteCode);
  }

  @Roles("STUDENT")
  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.studentInstructorsService.getStudentInstructors(user.sub);
  }
}
