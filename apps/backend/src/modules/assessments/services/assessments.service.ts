import {
  AssignmentSubmissionStatus,
  Prisma,
  QuizQuestionType
} from "@prisma/client";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { StudentAccessService } from "../../../shared/access/student-access.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import type { JwtPayload } from "../../../shared/types/auth.types";
import { SubscriptionsService } from "../../subscriptions/services/subscriptions.service";
import { CreateAssignmentDto } from "../dto/create-assignment.dto";
import { CreateQuizDto } from "../dto/create-quiz.dto";
import { ReviewAssignmentSubmissionDto } from "../dto/review-assignment-submission.dto";
import { SubmitAssignmentDto } from "../dto/submit-assignment.dto";
import { SubmitQuizDto } from "../dto/submit-quiz.dto";

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessService: StudentAccessService,
    private readonly subscriptionsService: SubscriptionsService
  ) {}

  async getCourseAssessments(user: JwtPayload, courseId: string) {
    const course =
      user.role === "INSTRUCTOR"
        ? await this.assertInstructorOwnsCourse(courseId, user)
        : await this.assertStudentCanAccessCourse(courseId, user);

    const [quizzes, assignments] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { courseId: course.id },
        orderBy: { createdAt: "asc" },
        include: {
          questions: {
            orderBy: { order: "asc" }
          },
          submissions:
            user.role === "STUDENT"
              ? {
                  where: { studentId: user.sub },
                  select: {
                    id: true,
                    score: true,
                    totalQuestions: true,
                    createdAt: true,
                    answers: true
                  }
                }
              : false
        }
      }),
      this.prisma.assignment.findMany({
        where: { courseId: course.id },
        orderBy: { createdAt: "asc" },
        include: {
          submissions:
            user.role === "STUDENT"
              ? {
                  where: { studentId: user.sub },
                  select: {
                    id: true,
                    content: true,
                    status: true,
                    feedback: true,
                    score: true,
                    createdAt: true,
                    updatedAt: true,
                    reviewedAt: true
                  }
                }
              : false
        }
      })
    ]);

    return {
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        createdAt: quiz.createdAt,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          question: question.question,
          type: question.type,
          options: question.options,
          order: question.order,
          ...(user.role === "INSTRUCTOR" ? { correctAnswer: question.correctAnswer } : {})
        })),
        submission: user.role === "STUDENT" ? quiz.submissions[0] ?? null : null
      })),
      assignments: assignments.map((assignment) => ({
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        instructions: assignment.instructions,
        createdAt: assignment.createdAt,
        submission: user.role === "STUDENT" ? assignment.submissions[0] ?? null : null
      }))
    };
  }

  async getCourseAssignmentSubmissions(user: JwtPayload, courseId: string) {
    await this.assertInstructorOwnsCourse(courseId, user);

    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: { createdAt: "asc" },
      include: {
        submissions: {
          orderBy: { updatedAt: "desc" },
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true
              }
            }
          }
        }
      }
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      instructions: assignment.instructions,
      submissions: assignment.submissions.map((submission) => ({
        id: submission.id,
        content: submission.content,
        status: submission.status,
        feedback: submission.feedback,
        score: submission.score,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        reviewedAt: submission.reviewedAt,
        student: submission.student
      }))
    }));
  }

  async reviewAssignmentSubmission(
    user: JwtPayload,
    assignmentId: string,
    submissionId: string,
    dto: ReviewAssignmentSubmissionDto
  ) {
    await this.subscriptionsService.assertPermission(user, "canUseAssignments");
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: { id: true }
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: {
        id: submissionId,
        assignmentId
      },
      select: { id: true }
    });

    if (!submission) {
      throw new NotFoundException("Assignment submission not found");
    }

    return this.prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        feedback: dto.feedback?.trim() || null,
        score: dto.score ?? null,
        status: AssignmentSubmissionStatus.REVIEWED,
        reviewedAt: new Date()
      }
    });
  }

  async createQuiz(user: JwtPayload, dto: CreateQuizDto) {
    await this.subscriptionsService.assertPermission(user, "canUseQuizzes");
    const course = await this.assertInstructorOwnsCourse(dto.courseId, user);

    const normalizedQuestions = dto.questions.map((question, index) => {
      const options = question.options.map((option) => option.trim()).filter(Boolean);
      const correctAnswer = question.correctAnswer.trim();

      if (options.length < 2) {
        throw new BadRequestException("Quiz questions must include at least two options");
      }

      if (!options.includes(correctAnswer)) {
        throw new BadRequestException("Correct answer must match one of the provided options");
      }

      return {
        question: question.question.trim(),
        options,
        correctAnswer,
        type: QuizQuestionType.MULTIPLE_CHOICE,
        order: index + 1
      };
    });

    return this.prisma.quiz.create({
      data: {
        courseId: course.id,
        tenantId: course.tenantId,
        instructorId: user.sub,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        questions: {
          create: normalizedQuestions.map((question) => ({
            ...question,
            options: question.options as Prisma.InputJsonValue
          }))
        }
      },
      include: {
        questions: {
          orderBy: { order: "asc" }
        }
      }
    });
  }

  async createAssignment(user: JwtPayload, dto: CreateAssignmentDto) {
    await this.subscriptionsService.assertPermission(user, "canUseAssignments");
    const course = await this.assertInstructorOwnsCourse(dto.courseId, user);

    return this.prisma.assignment.create({
      data: {
        courseId: course.id,
        tenantId: course.tenantId,
        instructorId: user.sub,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null
      }
    });
  }

  async submitQuiz(user: JwtPayload, quizId: string, dto: SubmitQuizDto) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can submit quizzes");
    }

    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId },
      include: {
        questions: { orderBy: { order: "asc" } }
      }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    await this.assertStudentCanAccessCourse(quiz.courseId, user);

    if (dto.answers.length !== quiz.questions.length) {
      throw new BadRequestException("All quiz questions must be answered");
    }

    const existing = await this.prisma.quizSubmission.findFirst({
      where: {
        quizId,
        studentId: user.sub
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException("Quiz already submitted");
    }

    const score = quiz.questions.reduce((total, question, index) => {
      return total + (dto.answers[index] === question.correctAnswer ? 1 : 0);
    }, 0);

    return this.prisma.quizSubmission.create({
      data: {
        quizId,
        studentId: user.sub,
        tenantId: quiz.tenantId,
        answers: dto.answers as Prisma.InputJsonValue,
        score,
        totalQuestions: quiz.questions.length
      }
    });
  }

  async submitAssignment(user: JwtPayload, assignmentId: string, dto: SubmitAssignmentDto) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can submit assignments");
    }

    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId },
      select: {
        id: true,
        tenantId: true,
        courseId: true
      }
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    await this.assertStudentCanAccessCourse(assignment.courseId, user);

    return this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId: user.sub
        }
      },
      update: {
        content: dto.content.trim(),
        status: AssignmentSubmissionStatus.PENDING_REVIEW,
        feedback: null,
        score: null,
        reviewedAt: null
      },
      create: {
        assignmentId,
        studentId: user.sub,
        tenantId: assignment.tenantId,
        content: dto.content.trim(),
        status: AssignmentSubmissionStatus.PENDING_REVIEW
      }
    });
  }

  private async assertInstructorOwnsCourse(courseId: string, user: JwtPayload) {
    if (user.role !== "INSTRUCTOR" || !user.tenantId) {
      throw new ForbiddenException("Instructor must belong to a tenant");
    }

    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        tenantId: user.tenantId,
        instructorId: user.sub
      },
      select: {
        id: true,
        tenantId: true
      }
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  private async assertStudentCanAccessCourse(courseId: string, user: JwtPayload) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can access assessments");
    }

    const course = await this.studentAccessService.getAccessiblePublishedCourseForStudent(user.sub, courseId, {
      id: true,
      tenantId: true,
      isPaid: true
    });

    if (!course) {
      throw new ForbiddenException("Join this instructor first");
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId: user.sub,
        courseId,
        tenantId: course.tenantId
      },
      select: { id: true }
    });

    if (!enrollment) {
      throw new ForbiddenException("Enroll in this course first");
    }

    return course;
  }
}
