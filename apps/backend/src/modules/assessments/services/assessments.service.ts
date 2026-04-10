import {
  AssessmentScopeType,
  AssignmentSubmissionStatus,
  Prisma,
  QuizAttemptStatus
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
import { UpdateAssignmentDto } from "../dto/update-assignment.dto";
import { UpdateQuizDto } from "../dto/update-quiz.dto";
import { AssessmentAuthoringService } from "./assessment-authoring.service";

type CourseOutlineSection = {
  id: string;
  title: string;
  lessons: Array<{ id: string; title: string }>;
};

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studentAccessService: StudentAccessService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly assessmentAuthoringService: AssessmentAuthoringService
  ) {}

  async getCourseAssessments(user: JwtPayload, courseId: string) {
    const course =
      user.role === "INSTRUCTOR"
        ? await this.assertInstructorOwnsCourse(courseId, user)
        : await this.assertStudentCanAccessCourse(courseId, user);

    const sections = await this.prisma.section.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        lessons: {
          orderBy: { order: "asc" },
          select: { id: true, title: true }
        }
      }
    });

    const completedLessonIds =
      user.role === "STUDENT"
        ? new Set(
            (
              await this.prisma.lessonCompletion.findMany({
                where: { userId: user.sub, courseId: course.id },
                select: { lessonId: true }
              })
            ).map((item) => item.lessonId)
          )
        : new Set<string>();

    const [quizzes, assignments] = await Promise.all([
      this.prisma.quiz.findMany({
        where: { courseId: course.id },
        orderBy: [{ scopeType: "asc" }, { createdAt: "asc" }],
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
              : false,
          attempts:
            user.role === "STUDENT"
              ? {
                  where: { studentId: user.sub },
                  select: {
                    id: true,
                    status: true,
                    enteredAt: true,
                    submittedAt: true,
                    blankRecordedAt: true
                  }
                }
              : false,
          section: {
            select: { id: true, title: true }
          },
          lesson: {
            select: { id: true, title: true }
          }
        }
      }),
      this.prisma.assignment.findMany({
        where: { courseId: course.id },
        orderBy: [{ scopeType: "asc" }, { createdAt: "asc" }],
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
              : false,
          section: {
            select: { id: true, title: true }
          },
          lesson: {
            select: { id: true, title: true }
          }
        }
      })
    ]);

    return {
      quizzes: quizzes.map((quiz) => {
        const studentAttempt = user.role === "STUDENT" ? (quiz.attempts[0] ?? null) : null;
        const studentSubmission = user.role === "STUDENT" ? (quiz.submissions[0] ?? null) : null;
        const gate = this.resolveAssessmentGate(
          sections,
          completedLessonIds,
          quiz.scopeType,
          quiz.sectionId,
          quiz.lessonId,
          user.role
        );

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          createdAt: quiz.createdAt,
          scopeType: quiz.scopeType,
          sectionId: quiz.sectionId,
          lessonId: quiz.lessonId,
          scopeLabel: this.buildScopeLabel(quiz.scopeType, quiz.section?.title, quiz.lesson?.title),
          isLocked: gate.isLocked,
          canAccess: !gate.isLocked,
          canEdit: user.role === "INSTRUCTOR",
          status:
            gate.isLocked
              ? "LOCKED"
              : studentAttempt?.status === QuizAttemptStatus.BLANK
                ? "BLANK"
                : studentSubmission
                  ? "SUBMITTED"
                  : studentAttempt?.status === QuizAttemptStatus.IN_PROGRESS
                    ? "IN_PROGRESS"
                    : "READY",
          lockReason: gate.lockReason,
          attemptStatus: studentAttempt?.status ?? "NOT_STARTED",
          canEnter: user.role === "STUDENT" ? !gate.isLocked && !studentAttempt : !gate.isLocked,
          hasConsumedAttempt: Boolean(studentAttempt),
          enteredAt: studentAttempt?.enteredAt ?? null,
          questions: quiz.questions.map((question) => ({
            id: question.id,
            question: question.question,
            type: question.type,
            options: question.options,
            order: question.order,
            ...(user.role === "INSTRUCTOR" ? { correctAnswer: question.correctAnswer } : {})
          })),
          submission: studentSubmission
        };
      }),
      assignments: assignments.map((assignment) => {
        const gate = this.resolveAssessmentGate(
          sections,
          completedLessonIds,
          assignment.scopeType,
          assignment.sectionId,
          assignment.lessonId,
          user.role
        );

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          instructions: assignment.instructions,
          createdAt: assignment.createdAt,
          scopeType: assignment.scopeType,
          sectionId: assignment.sectionId,
          lessonId: assignment.lessonId,
          scopeLabel: this.buildScopeLabel(
            assignment.scopeType,
            assignment.section?.title,
            assignment.lesson?.title
          ),
          isLocked: gate.isLocked,
          canAccess: !gate.isLocked,
          canEdit: user.role === "INSTRUCTOR",
          status:
            gate.isLocked
              ? "LOCKED"
              : user.role === "STUDENT" && assignment.submissions[0]
                ? assignment.submissions[0].status === AssignmentSubmissionStatus.REVIEWED
                  ? "REVIEWED"
                  : "SUBMITTED"
                : "READY",
          lockReason: gate.lockReason,
          submission: user.role === "STUDENT" ? assignment.submissions[0] ?? null : null
        };
      })
    };
  }

  async getCourseAssignmentSubmissions(user: JwtPayload, courseId: string) {
    await this.assertInstructorOwnsCourse(courseId, user);

    const assignments = await this.prisma.assignment.findMany({
      where: { courseId },
      orderBy: [{ scopeType: "asc" }, { createdAt: "asc" }],
      include: {
        section: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
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
      scopeType: assignment.scopeType,
      sectionId: assignment.sectionId,
      lessonId: assignment.lessonId,
      scopeLabel: this.buildScopeLabel(
        assignment.scopeType,
        assignment.section?.title,
        assignment.lesson?.title
      ),
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

  async getCourseQuizSubmissions(user: JwtPayload, courseId: string) {
    await this.assertInstructorOwnsCourse(courseId, user);

    const quizzes = await this.prisma.quiz.findMany({
      where: { courseId },
      orderBy: [{ scopeType: "asc" }, { createdAt: "asc" }],
      include: {
        questions: {
          orderBy: { order: "asc" }
        },
        section: { select: { id: true, title: true } },
        lesson: { select: { id: true, title: true } },
        submissions: {
          orderBy: { createdAt: "desc" },
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

    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      scopeType: quiz.scopeType,
      sectionId: quiz.sectionId,
      lessonId: quiz.lessonId,
      scopeLabel: this.buildScopeLabel(quiz.scopeType, quiz.section?.title, quiz.lesson?.title),
      questions: quiz.questions.map((question) => ({
        id: question.id,
        question: question.question,
        options: question.options,
        correctAnswer: question.correctAnswer,
        order: question.order
      })),
      submissions: quiz.submissions.map((submission) => ({
        id: submission.id,
        score: submission.score,
        totalQuestions: submission.totalQuestions,
        createdAt: submission.createdAt,
        answers: submission.answers,
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
    const scope = await this.resolveAssessmentScopeForWrite(user, dto.courseId, dto.scopeType, dto.sectionId, dto.lessonId);
    const normalizedQuestions = this.assessmentAuthoringService.normalizeQuizQuestions(dto.questions);

    return this.prisma.quiz.create({
      data: {
        courseId: scope.courseId,
        sectionId: scope.sectionId,
        lessonId: scope.lessonId,
        tenantId: scope.tenantId,
        instructorId: user.sub,
        scopeType: scope.scopeType,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        questions: {
          create: normalizedQuestions.map((question) =>
            this.assessmentAuthoringService.toQuizQuestionCreateInput(question)
          )
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
    const scope = await this.resolveAssessmentScopeForWrite(user, dto.courseId, dto.scopeType, dto.sectionId, dto.lessonId);

    return this.prisma.assignment.create({
      data: {
        courseId: scope.courseId,
        sectionId: scope.sectionId,
        lessonId: scope.lessonId,
        tenantId: scope.tenantId,
        instructorId: user.sub,
        scopeType: scope.scopeType,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null
      }
    });
  }

  async updateQuiz(user: JwtPayload, quizId: string, dto: UpdateQuizDto) {
    await this.subscriptionsService.assertPermission(user, "canUseQuizzes");
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: {
        id: true,
        courseId: true
      }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    const scope = await this.resolveAssessmentScopeForWrite(user, quiz.courseId, dto.scopeType, dto.sectionId, dto.lessonId);
    const normalizedQuestions = this.assessmentAuthoringService.normalizeQuizQuestions(dto.questions);

    return this.prisma.$transaction(async (tx) => {
      await tx.quizQuestion.deleteMany({
        where: { quizId: quiz.id }
      });

      return tx.quiz.update({
        where: { id: quiz.id },
        data: {
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          scopeType: scope.scopeType,
          sectionId: scope.sectionId,
          lessonId: scope.lessonId,
          questions: {
            create: normalizedQuestions.map((question) =>
              this.assessmentAuthoringService.toQuizQuestionCreateInput(question)
            )
          }
        },
        include: {
          questions: {
            orderBy: { order: "asc" }
          }
        }
      });
    });
  }

  async removeQuiz(user: JwtPayload, quizId: string) {
    await this.subscriptionsService.assertPermission(user, "canUseQuizzes");
    const quiz = await this.prisma.quiz.findFirst({
      where: {
        id: quizId,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: { id: true }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    await this.prisma.quiz.delete({
      where: { id: quiz.id }
    });

    return { deleted: true };
  }

  async updateAssignment(user: JwtPayload, assignmentId: string, dto: UpdateAssignmentDto) {
    await this.subscriptionsService.assertPermission(user, "canUseAssignments");
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        tenantId: user.tenantId ?? undefined,
        instructorId: user.sub
      },
      select: {
        id: true,
        courseId: true
      }
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    const scope = await this.resolveAssessmentScopeForWrite(user, assignment.courseId, dto.scopeType, dto.sectionId, dto.lessonId);

    return this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        instructions: dto.instructions?.trim() || null,
        scopeType: scope.scopeType,
        sectionId: scope.sectionId,
        lessonId: scope.lessonId
      }
    });
  }

  async removeAssignment(user: JwtPayload, assignmentId: string) {
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

    await this.prisma.assignment.delete({
      where: { id: assignment.id }
    });

    return { deleted: true };
  }

  async startQuizAttempt(user: JwtPayload, quizId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can start quizzes");
    }

    const quiz = await this.getStudentQuizAttemptContext(quizId, user);

    const existingAttempt = await this.prisma.quizAttempt.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId: user.sub
        }
      },
      select: {
        id: true,
        status: true,
        enteredAt: true
      }
    });

    if (existingAttempt) {
      throw new ConflictException("This exam has already been opened. Re-entry is not allowed.");
    }

    return this.prisma.quizAttempt.create({
      data: {
        quizId,
        studentId: user.sub,
        tenantId: quiz.tenantId,
        status: QuizAttemptStatus.IN_PROGRESS
      },
      select: {
        id: true,
        status: true,
        enteredAt: true
      }
    });
  }

  async abandonQuizAttempt(user: JwtPayload, quizId: string) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can abandon quizzes");
    }

    const quiz = await this.getStudentQuizAttemptContext(quizId, user);
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: {
        quizId_studentId: {
          quizId,
          studentId: user.sub
        }
      },
      select: {
        id: true,
        status: true
      }
    });

    if (!attempt) {
      throw new NotFoundException("Quiz attempt not found");
    }

    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      return {
        id: attempt.id,
        status: attempt.status
      };
    }

    return this.prisma.$transaction(async (tx) => {
      const existingSubmission = await tx.quizSubmission.findUnique({
        where: {
          quizId_studentId: {
            quizId,
            studentId: user.sub
          }
        },
        select: { id: true }
      });

      if (!existingSubmission) {
        await tx.quizSubmission.create({
          data: {
            quizId,
            studentId: user.sub,
            tenantId: quiz.tenantId,
            answers: [] as Prisma.InputJsonValue,
            score: 0,
            totalQuestions: quiz.questions.length
          }
        });
      }

      return tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: QuizAttemptStatus.BLANK,
          blankRecordedAt: new Date()
        },
        select: {
          id: true,
          status: true,
          blankRecordedAt: true
        }
      });
    });
  }

  async submitQuiz(user: JwtPayload, quizId: string, dto: SubmitQuizDto) {
    if (user.role !== "STUDENT") {
      throw new ForbiddenException("Only students can submit quizzes");
    }

    const quiz = await this.getStudentQuizAttemptContext(quizId, user);

    if (dto.answers.length !== quiz.questions.length) {
      throw new BadRequestException("All quiz questions must be answered");
    }

    const [attempt, existingSubmission] = await Promise.all([
      this.prisma.quizAttempt.findUnique({
        where: {
          quizId_studentId: {
            quizId,
            studentId: user.sub
          }
        },
        select: {
          id: true,
          status: true
        }
      }),
      this.prisma.quizSubmission.findUnique({
        where: {
          quizId_studentId: {
            quizId,
            studentId: user.sub
          }
        },
        select: { id: true }
      })
    ]);

    if (!attempt) {
      throw new ConflictException("Open the exam first to start your single allowed attempt.");
    }

    if (attempt.status !== QuizAttemptStatus.IN_PROGRESS) {
      throw new ConflictException("This exam attempt has already been consumed.");
    }

    if (existingSubmission) {
      throw new ConflictException("Quiz already submitted");
    }

    const score = quiz.questions.reduce((total, question, index) => {
      return total + (dto.answers[index] === question.correctAnswer ? 1 : 0);
    }, 0);

    return this.prisma.$transaction(async (tx) => {
      const submission = await tx.quizSubmission.create({
        data: {
          quizId,
          studentId: user.sub,
          tenantId: quiz.tenantId,
          answers: dto.answers as Prisma.InputJsonValue,
          score,
          totalQuestions: quiz.questions.length
        }
      });

      await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: QuizAttemptStatus.SUBMITTED,
          submittedAt: new Date()
        }
      });

      return submission;
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
        courseId: true,
        scopeType: true,
        sectionId: true,
        lessonId: true,
        course: {
          select: {
            sections: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                lessons: {
                  orderBy: { order: "asc" },
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      }
    });

    if (!assignment) {
      throw new NotFoundException("Assignment not found");
    }

    await this.assertStudentCanAccessCourse(assignment.courseId, user);

    const completedLessonIds = new Set(
      (
        await this.prisma.lessonCompletion.findMany({
          where: { userId: user.sub, courseId: assignment.courseId },
          select: { lessonId: true }
        })
      ).map((item) => item.lessonId)
    );

    const gate = this.resolveAssessmentGate(
      assignment.course.sections,
      completedLessonIds,
      assignment.scopeType,
      assignment.sectionId,
      assignment.lessonId,
      user.role
    );

    if (gate.isLocked) {
      throw new ForbiddenException(gate.lockReason ?? "Complete the required learning first");
    }

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

  private async getStudentQuizAttemptContext(quizId: string, user: JwtPayload) {
    const quiz = await this.prisma.quiz.findFirst({
      where: { id: quizId },
      include: {
        questions: { orderBy: { order: "asc" } },
        course: {
          select: {
            id: true,
            tenantId: true,
            sections: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                title: true,
                lessons: {
                  orderBy: { order: "asc" },
                  select: { id: true, title: true }
                }
              }
            }
          }
        }
      }
    });

    if (!quiz) {
      throw new NotFoundException("Quiz not found");
    }

    await this.assertStudentCanAccessCourse(quiz.courseId, user);

    const completedLessonIds = new Set(
      (
        await this.prisma.lessonCompletion.findMany({
          where: { userId: user.sub, courseId: quiz.courseId },
          select: { lessonId: true }
        })
      ).map((item) => item.lessonId)
    );

    const gate = this.resolveAssessmentGate(
      quiz.course.sections,
      completedLessonIds,
      quiz.scopeType,
      quiz.sectionId,
      quiz.lessonId,
      user.role
    );

    if (gate.isLocked) {
      throw new ForbiddenException(gate.lockReason ?? "Complete the required learning first");
    }

    return quiz;
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

  private async resolveAssessmentScopeForWrite(
    user: JwtPayload,
    courseId: string,
    scopeType: AssessmentScopeType,
    sectionId?: string | null,
    lessonId?: string | null
  ) {
    const course = await this.assertInstructorOwnsCourse(courseId, user);

    if (scopeType === AssessmentScopeType.COURSE) {
      if (sectionId || lessonId) {
        throw new BadRequestException("Course-level assessments cannot target a section or lesson");
      }

      return {
        courseId: course.id,
        tenantId: course.tenantId,
        scopeType,
        sectionId: null,
        lessonId: null
      };
    }

    if (scopeType === AssessmentScopeType.SECTION) {
      if (!sectionId) {
        throw new BadRequestException("Section-level assessments must target a section");
      }
      if (lessonId) {
        throw new BadRequestException("Section-level assessments cannot target a lesson");
      }

      const section = await this.prisma.section.findFirst({
        where: {
          id: sectionId,
          courseId: course.id
        },
        select: { id: true }
      });

      if (!section) {
        throw new BadRequestException("Selected section does not belong to this course");
      }

      return {
        courseId: course.id,
        tenantId: course.tenantId,
        scopeType,
        sectionId: section.id,
        lessonId: null
      };
    }

    if (!lessonId) {
      throw new BadRequestException("Lesson-level assessments must target a lesson");
    }

    const lesson = await this.prisma.lesson.findFirst({
      where: {
        id: lessonId,
        section: {
          courseId: course.id,
          ...(sectionId ? { id: sectionId } : {})
        }
      },
      select: {
        id: true,
        sectionId: true
      }
    });

    if (!lesson) {
      throw new BadRequestException("Selected lesson does not belong to this course");
    }

    return {
      courseId: course.id,
      tenantId: course.tenantId,
      scopeType,
      sectionId: lesson.sectionId,
      lessonId: lesson.id
    };
  }

  private resolveAssessmentGate(
    sections: CourseOutlineSection[],
    completedLessonIds: Set<string>,
    scopeType: AssessmentScopeType,
    sectionId: string | null,
    lessonId: string | null,
    role: JwtPayload["role"]
  ) {
    if (role === "INSTRUCTOR") {
      return { isLocked: false, lockReason: null };
    }

    if (scopeType === AssessmentScopeType.LESSON) {
      const unlocked = lessonId ? completedLessonIds.has(lessonId) : false;
      return {
        isLocked: !unlocked,
        lockReason: unlocked ? null : "Complete this lesson to unlock the assessment"
      };
    }

    if (scopeType === AssessmentScopeType.SECTION) {
      const section = sections.find((item) => item.id === sectionId);
      const unlocked = section
        ? section.lessons.every((lesson) => completedLessonIds.has(lesson.id))
        : false;
      return {
        isLocked: !unlocked,
        lockReason: unlocked ? null : "Complete every lesson in this section to unlock the assessment"
      };
    }

    const allLessons = sections.flatMap((section) => section.lessons);
    const unlocked = allLessons.every((lesson) => completedLessonIds.has(lesson.id));
    return {
      isLocked: !unlocked,
      lockReason: unlocked ? null : "Complete the full course to unlock the assessment"
    };
  }

  private buildScopeLabel(
    scopeType: AssessmentScopeType,
    sectionTitle?: string | null,
    lessonTitle?: string | null
  ) {
    if (scopeType === AssessmentScopeType.LESSON) {
      return lessonTitle ? `Lesson: ${lessonTitle}` : "Lesson";
    }

    if (scopeType === AssessmentScopeType.SECTION) {
      return sectionTitle ? `Section: ${sectionTitle}` : "Section";
    }

    return "Course";
  }
}
