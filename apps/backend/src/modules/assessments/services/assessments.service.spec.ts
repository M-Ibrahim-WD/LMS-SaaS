import assert from "node:assert/strict";
import test from "node:test";
import { AssessmentsService } from "./assessments.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("submitQuiz scores answers and stores the submission", async () => {
  const prisma: any = {
    quiz: {
      findFirst: createAsyncMock(async () => ({
        id: "quiz-1",
        tenantId: "tenant-1",
        courseId: "course-1",
        scopeType: "COURSE",
        sectionId: null,
        lessonId: null,
        course: {
          sections: []
        },
        questions: [
          {
            correctAnswer: "A"
          },
          {
            correctAnswer: "B"
          }
        ]
      }))
    },
    lessonCompletion: {
      findMany: createAsyncMock(async () => [])
    },
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    },
    quizSubmission: {
      findUnique: createAsyncMock(async () => null),
      create: createAsyncMock(async ({ data }: { data: { score: number; totalQuestions: number } }) => ({
        id: "submission-1",
        ...data
      }))
    },
    quizAttempt: {
      findUnique: createAsyncMock(async () => ({
        id: "attempt-1",
        status: "IN_PROGRESS"
      })),
      update: createAsyncMock(async () => ({
        id: "attempt-1",
        status: "SUBMITTED"
      }))
    },
    $transaction: createAsyncMock(async (callback: (tx: any) => unknown) => callback(prisma))
  };

  const studentAccessService = {
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1",
      isPaid: false
    }))
  };
  const assessmentAuthoringService = {
    normalizeQuizQuestions: (questions: Array<{ question?: string; options: string[]; correctAnswer: string }>) =>
      questions.map((question, index) => ({
        question: question.question ?? "",
        options: question.options,
        correctAnswer: question.correctAnswer,
        type: "MULTIPLE_CHOICE",
        order: index + 1
      })),
    toQuizQuestionCreateInput: (question: unknown) => question
  };

  const service = new AssessmentsService(
    prisma as never,
    studentAccessService as never,
    {} as never,
    assessmentAuthoringService as never
  );

  const result = await service.submitQuiz(
    {
      sub: "student-1",
      role: "STUDENT",
      email: "student@example.com",
      tenantId: null
    },
    "quiz-1",
    {
      answers: ["A", "C"]
    }
  );

  assert.equal(prisma.quizSubmission.create.calls.length, 1);
  assert.equal(prisma.quizAttempt.update.calls.length, 1);
  assert.equal(result.score, 1);
  assert.equal(result.totalQuestions, 2);
});

test("startQuizAttempt creates a single in-progress attempt", async () => {
  const prisma = {
    quiz: {
      findFirst: createAsyncMock(async () => ({
        id: "quiz-1",
        tenantId: "tenant-1",
        courseId: "course-1",
        scopeType: "COURSE",
        sectionId: null,
        lessonId: null,
        course: {
          sections: []
        },
        questions: [{ correctAnswer: "A" }]
      }))
    },
    lessonCompletion: {
      findMany: createAsyncMock(async () => [])
    },
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    },
    quizAttempt: {
      findUnique: createAsyncMock(async () => null),
      create: createAsyncMock(async ({ data }: { data: { status: string } }) => ({
        id: "attempt-1",
        enteredAt: new Date(),
        ...data
      }))
    }
  };

  const studentAccessService = {
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1",
      isPaid: false
    }))
  };
  const assessmentAuthoringService = {
    normalizeQuizQuestions: (questions: Array<{ question?: string; options: string[]; correctAnswer: string }>) =>
      questions.map((question, index) => ({
        question: question.question ?? "",
        options: question.options,
        correctAnswer: question.correctAnswer,
        type: "MULTIPLE_CHOICE",
        order: index + 1
      })),
    toQuizQuestionCreateInput: (question: unknown) => question
  };

  const service = new AssessmentsService(
    prisma as never,
    studentAccessService as never,
    {} as never,
    assessmentAuthoringService as never
  );

  const result = await service.startQuizAttempt(
    {
      sub: "student-1",
      role: "STUDENT",
      email: "student@example.com",
      tenantId: null
    },
    "quiz-1"
  );

  assert.equal(prisma.quizAttempt.create.calls.length, 1);
  assert.equal(result.status, "IN_PROGRESS");
});

test("abandonQuizAttempt records a blank submission and consumes the attempt", async () => {
  const prisma: any = {
    quiz: {
      findFirst: createAsyncMock(async () => ({
        id: "quiz-1",
        tenantId: "tenant-1",
        courseId: "course-1",
        scopeType: "COURSE",
        sectionId: null,
        lessonId: null,
        course: {
          sections: []
        },
        questions: [{ correctAnswer: "A" }, { correctAnswer: "B" }]
      }))
    },
    lessonCompletion: {
      findMany: createAsyncMock(async () => [])
    },
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    },
    quizAttempt: {
      findUnique: createAsyncMock(async () => ({
        id: "attempt-1",
        status: "IN_PROGRESS"
      })),
      update: createAsyncMock(async () => ({
        id: "attempt-1",
        status: "BLANK"
      }))
    },
    quizSubmission: {
      findUnique: createAsyncMock(async () => null),
      create: createAsyncMock(async ({ data }: { data: { score: number; totalQuestions: number } }) => ({
        id: "submission-1",
        ...data
      }))
    },
    $transaction: createAsyncMock(async (callback: (tx: any) => unknown) => callback(prisma))
  };

  const studentAccessService = {
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1",
      isPaid: false
    }))
  };

  const service = new AssessmentsService(
    prisma as never,
    studentAccessService as never,
    {} as never,
    {} as never
  );

  const result = await service.abandonQuizAttempt(
    {
      sub: "student-1",
      role: "STUDENT",
      email: "student@example.com",
      tenantId: null
    },
    "quiz-1"
  );

  assert.equal(prisma.quizSubmission.create.calls.length, 1);
  assert.equal(prisma.quizAttempt.update.calls.length, 1);
  assert.equal(result.status, "BLANK");
});

test("getCourseAssessments marks lesson-scoped quiz as locked until the lesson is completed", async () => {
  const prisma = {
    section: {
      findMany: createAsyncMock(async () => [
        {
          id: "section-1",
          title: "Section 1",
          lessons: [{ id: "lesson-1", title: "Lesson 1" }]
        }
      ])
    },
    lessonCompletion: {
      findMany: createAsyncMock(async () => [])
    },
    quiz: {
      findMany: createAsyncMock(async () => [
        {
          id: "quiz-1",
          title: "Lesson quiz",
          description: null,
          createdAt: new Date(),
          scopeType: "LESSON",
          sectionId: "section-1",
          lessonId: "lesson-1",
          questions: [],
          submissions: [],
          attempts: [],
          section: { id: "section-1", title: "Section 1" },
          lesson: { id: "lesson-1", title: "Lesson 1" }
        }
      ])
    },
    assignment: {
      findMany: createAsyncMock(async () => [])
    },
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    }
  };

  const studentAccessService = {
    getAccessiblePublishedCourseForStudent: createAsyncMock(async () => ({
      id: "course-1",
      tenantId: "tenant-1",
      isPaid: false
    }))
  };

  const service = new AssessmentsService(
    prisma as never,
    studentAccessService as never,
    {} as never,
    {} as never
  );

  const result = await service.getCourseAssessments(
    {
      sub: "student-1",
      role: "STUDENT",
      email: "student@example.com",
      tenantId: null
    },
    "course-1"
  );

  assert.equal(result.quizzes[0]?.isLocked, true);
  assert.equal(result.quizzes[0]?.canAccess, false);
  assert.equal(result.quizzes[0]?.status, "LOCKED");
  assert.match(result.quizzes[0]?.lockReason ?? "", /Complete this lesson/i);
});
