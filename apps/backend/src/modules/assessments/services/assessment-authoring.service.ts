import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma, QuizQuestionType } from "@prisma/client";

type QuizQuestionInput = {
  question: string;
  options: string[];
  correctAnswer: string;
};

type NormalizedQuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  type: QuizQuestionType;
  order: number;
};

@Injectable()
export class AssessmentAuthoringService {
  normalizeQuizQuestions(questions: QuizQuestionInput[]) {
    return questions.map((question, index): NormalizedQuizQuestion => {
      const options = question.options.map((option) => option.trim()).filter(Boolean);
      const correctAnswer = question.correctAnswer.trim();

      if (options.length < 2) {
        throw new BadRequestException(
          "Quiz questions must include at least two options"
        );
      }

      if (!options.includes(correctAnswer)) {
        throw new BadRequestException(
          "Correct answer must match one of the provided options"
        );
      }

      return {
        question: question.question.trim(),
        options,
        correctAnswer,
        type: QuizQuestionType.MULTIPLE_CHOICE,
        order: index + 1
      };
    });
  }

  toQuizQuestionCreateInput(question: NormalizedQuizQuestion) {
    return {
      ...question,
      options: question.options as Prisma.InputJsonValue
    };
  }
}
