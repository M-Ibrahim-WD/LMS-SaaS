import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../../../shared/decorators/current-user.decorator";
import { RequireTenant } from "../../../shared/decorators/require-tenant.decorator";
import { Roles } from "../../../shared/decorators/roles.decorator";
import { TenantContextGuard } from "../../../shared/guards/tenant-context.guard";
import { RolesGuard } from "../../../shared/guards/roles.guard";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CreateAssignmentDto } from "../dto/create-assignment.dto";
import { CreateQuizDto } from "../dto/create-quiz.dto";
import { ReviewAssignmentSubmissionDto } from "../dto/review-assignment-submission.dto";
import { SubmitAssignmentDto } from "../dto/submit-assignment.dto";
import { SubmitQuizDto } from "../dto/submit-quiz.dto";
import { UpdateAssignmentDto } from "../dto/update-assignment.dto";
import { UpdateQuizDto } from "../dto/update-quiz.dto";
import { AssessmentsService } from "../services/assessments.service";

@Controller("assessments")
@UseGuards(JwtAuthGuard, TenantContextGuard, RolesGuard)
@RequireTenant()
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get("courses/:courseId")
  getCourseAssessments(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.assessmentsService.getCourseAssessments(user, courseId);
  }

  @Roles("INSTRUCTOR")
  @Post("quizzes")
  createQuiz(@CurrentUser() user: JwtPayload, @Body() dto: CreateQuizDto) {
    return this.assessmentsService.createQuiz(user, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("quizzes/:quizId")
  updateQuiz(@CurrentUser() user: JwtPayload, @Param("quizId") quizId: string, @Body() dto: UpdateQuizDto) {
    return this.assessmentsService.updateQuiz(user, quizId, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("assignments/:assignmentId")
  updateAssignment(
    @CurrentUser() user: JwtPayload,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: UpdateAssignmentDto
  ) {
    return this.assessmentsService.updateAssignment(user, assignmentId, dto);
  }

  @Roles("INSTRUCTOR")
  @Post("assignments")
  createAssignment(@CurrentUser() user: JwtPayload, @Body() dto: CreateAssignmentDto) {
    return this.assessmentsService.createAssignment(user, dto);
  }

  @Roles("INSTRUCTOR")
  @Patch("assignments/:assignmentId/delete")
  removeAssignment(@CurrentUser() user: JwtPayload, @Param("assignmentId") assignmentId: string) {
    return this.assessmentsService.removeAssignment(user, assignmentId);
  }

  @Roles("INSTRUCTOR")
  @Patch("quizzes/:quizId/delete")
  removeQuiz(@CurrentUser() user: JwtPayload, @Param("quizId") quizId: string) {
    return this.assessmentsService.removeQuiz(user, quizId);
  }

  @Roles("INSTRUCTOR")
  @Get("courses/:courseId/quiz-submissions")
  getCourseQuizSubmissions(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.assessmentsService.getCourseQuizSubmissions(user, courseId);
  }

  @Roles("INSTRUCTOR")
  @Get("courses/:courseId/assignment-submissions")
  getCourseAssignmentSubmissions(@CurrentUser() user: JwtPayload, @Param("courseId") courseId: string) {
    return this.assessmentsService.getCourseAssignmentSubmissions(user, courseId);
  }

  @Roles("INSTRUCTOR")
  @Patch("assignments/:assignmentId/submissions/:submissionId/review")
  reviewAssignmentSubmission(
    @CurrentUser() user: JwtPayload,
    @Param("assignmentId") assignmentId: string,
    @Param("submissionId") submissionId: string,
    @Body() dto: ReviewAssignmentSubmissionDto
  ) {
    return this.assessmentsService.reviewAssignmentSubmission(user, assignmentId, submissionId, dto);
  }

  @Roles("STUDENT")
  @Post("quizzes/:quizId/submit")
  submitQuiz(
    @CurrentUser() user: JwtPayload,
    @Param("quizId") quizId: string,
    @Body() dto: SubmitQuizDto
  ) {
    return this.assessmentsService.submitQuiz(user, quizId, dto);
  }

  @Roles("STUDENT")
  @Post("assignments/:assignmentId/submit")
  submitAssignment(
    @CurrentUser() user: JwtPayload,
    @Param("assignmentId") assignmentId: string,
    @Body() dto: SubmitAssignmentDto
  ) {
    return this.assessmentsService.submitAssignment(user, assignmentId, dto);
  }
}
