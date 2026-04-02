import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { Res } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateCourseDto } from "../dto/create-course.dto";
import { CreateCourseInterviewDto } from "../dto/create-course-interview.dto";
import { CourseQueryDto } from "../dto/course-query.dto";
import { UpdateCourseInterviewDto } from "../dto/update-course-interview.dto";
import { UpdateCourseInterviewStatusDto } from "../dto/update-course-interview-status.dto";
import { UpdateCourseStatusDto } from "../dto/update-course-status.dto";
import { UpdateCourseDto } from "../dto/update-course.dto";
import { CourseInterviewsService } from "../services/course-interviews.service";
import { CoursesService } from "../services/courses.service";

type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname: string;
};

@Controller("courses")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly courseInterviewsService: CourseInterviewsService
  ) {}

  @Roles("INSTRUCTOR")
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCourseDto) {
    return this.coursesService.create(user, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch(":id")
  update(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body() dto: UpdateCourseDto) {
    return this.coursesService.update(user, id, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch(":id/thumbnail")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 4 * 1024 * 1024 } }))
  uploadThumbnail(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @UploadedFile() file: UploadedImageFile
  ) {
    if (!file) {
      throw new BadRequestException("Course thumbnail is required");
    }

    return this.coursesService.uploadThumbnail(user, id, file);
  }

  @Roles("INSTRUCTOR")
  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: UpdateCourseStatusDto
  ) {
    return this.coursesService.updateStatus(user, id, dto);
  }

  @Get()
  getAll(@CurrentUser() user: JwtPayload, @Query() query: CourseQueryDto) {
    return this.coursesService.getAllByTenant(user, query);
  }

  @Roles("STUDENT")
  @Get("continue-learning")
  getContinueLearning(@CurrentUser() user: JwtPayload) {
    return this.coursesService.getContinueLearning(user);
  }

  @Roles("INSTRUCTOR")
  @Get(":id/learners")
  getCourseLearners(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.coursesService.getCourseLearners(user, id);
  }

  @Get(":id")
  getOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.coursesService.getOne(user, id);
  }

  @Get(":id/interviews")
  listInterviews(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.courseInterviewsService.listForCourse(user, id);
  }

  @Roles("INSTRUCTOR")
  @Get("interviews/dashboard")
  listDashboardInterviews(@CurrentUser() user: JwtPayload) {
    return this.courseInterviewsService.listForInstructorDashboard(user);
  }

  @Get("interviews/:interviewId")
  getInterview(@CurrentUser() user: JwtPayload, @Param("interviewId") interviewId: string) {
    return this.courseInterviewsService.getOne(user, interviewId);
  }

  @Post("interviews/:interviewId/attendance")
  recordInterviewAttendance(
    @CurrentUser() user: JwtPayload,
    @Param("interviewId") interviewId: string
  ) {
    return this.courseInterviewsService.recordAttendance(user, interviewId);
  }

  @Roles("INSTRUCTOR")
  @Post(":id/interviews")
  createInterview(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Body() dto: CreateCourseInterviewDto
  ) {
    return this.courseInterviewsService.create(user, id, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("interviews/:interviewId")
  updateInterview(
    @CurrentUser() user: JwtPayload,
    @Param("interviewId") interviewId: string,
    @Body() dto: UpdateCourseInterviewDto
  ) {
    return this.courseInterviewsService.update(user, interviewId, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("interviews/:interviewId/status")
  updateInterviewStatus(
    @CurrentUser() user: JwtPayload,
    @Param("interviewId") interviewId: string,
    @Body() dto: UpdateCourseInterviewStatusDto
  ) {
    return this.courseInterviewsService.updateStatus(user, interviewId, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("interviews/:interviewId/delete")
  deleteInterview(
    @CurrentUser() user: JwtPayload,
    @Param("interviewId") interviewId: string
  ) {
    return this.courseInterviewsService.remove(user, interviewId);
  }

  @Roles("STUDENT")
  @Post(":courseId/lessons/:lessonId/complete")
  completeLesson(
    @CurrentUser() user: JwtPayload,
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string
  ) {
    return this.coursesService.completeLesson(user, courseId, lessonId);
  }

  @Roles("STUDENT")
  @Post(":courseId/lessons/:lessonId/view")
  trackLessonView(
    @CurrentUser() user: JwtPayload,
    @Param("courseId") courseId: string,
    @Param("lessonId") lessonId: string
  ) {
    return this.coursesService.trackLessonView(user, courseId, lessonId);
  }
}

@Controller("courses")
export class CoursesPublicController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get(":id/thumbnail")
  async getThumbnail(@Param("id") id: string, @Res({ passthrough: true }) res: Response) {
    const file = await this.coursesService.readThumbnail(id);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `inline; filename="${file.fileName}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return new StreamableFile(file.buffer);
  }
}
