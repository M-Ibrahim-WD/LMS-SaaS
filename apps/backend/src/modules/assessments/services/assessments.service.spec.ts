import assert from "node:assert/strict";
import test from "node:test";
import { AssessmentsService } from "./assessments.service";
import { createAsyncMock } from "../../../test/mock-utils";

test("submitQuiz scores answers and stores the submission", async () => {
  const prisma = {
    quiz: {
      findFirst: createAsyncMock(async () => ({
        id: "quiz-1",
        tenantId: "tenant-1",
        courseId: "course-1",
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
    enrollment: {
      findFirst: createAsyncMock(async () => ({ id: "enrollment-1" }))
    },
    quizSubmission: {
      findFirst: createAsyncMock(async () => null),
      create: createAsyncMock(async ({ data }: { data: { score: number; totalQuestions: number } }) => ({
        id: "submission-1",
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
  assert.equal(result.score, 1);
  assert.equal(result.totalQuestions, 2);
});
