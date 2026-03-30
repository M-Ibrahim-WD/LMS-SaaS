import { Injectable } from "@nestjs/common";

import { PrismaService } from "../../../shared/prisma/prisma.service";

export type CourseProgressSummary = {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  isComplete: boolean;
};

@Injectable()
export class CourseProgressService {
  constructor(private readonly prisma: PrismaService) {}

  flattenLessons(
    sections: Array<{
      lessons: Array<{ id: string; title: string; order: number }>;
      order: number;
    }>
  ) {
    return sections
      .slice()
      .sort((left, right) => left.order - right.order)
      .flatMap((section) =>
        section.lessons.slice().sort((left, right) => left.order - right.order)
      );
  }

  async getCompletedLessonIds(userId: string, courseId: string) {
    const completions = await this.prisma.lessonCompletion.findMany({
      where: {
        userId,
        courseId
      },
      select: {
        lessonId: true
      }
    });

    return new Set(completions.map((completion) => completion.lessonId));
  }

  async getCourseProgressSummaryForCourse(
    courseId: string,
    userId: string
  ): Promise<CourseProgressSummary> {
    const [totalLessons, completedLessons] = await Promise.all([
      this.prisma.lesson.count({
        where: {
          section: {
            courseId
          }
        }
      }),
      this.prisma.lessonCompletion.count({
        where: {
          userId,
          courseId
        }
      })
    ]);

    return this.buildCourseProgress(totalLessons, completedLessons);
  }

  buildCourseProgress(totalLessons: number, completedLessons: number): CourseProgressSummary {
    const percentage =
      totalLessons > 0
        ? Math.round(
            (Math.min(completedLessons, totalLessons) / totalLessons) * 100
          )
        : 0;

    return {
      totalLessons,
      completedLessons,
      percentage,
      isComplete: totalLessons > 0 && completedLessons >= totalLessons
    };
  }
}
