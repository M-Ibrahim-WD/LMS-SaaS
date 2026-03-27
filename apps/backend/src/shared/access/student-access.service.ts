import { Injectable } from "@nestjs/common";
import { CourseStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class StudentAccessService {
  constructor(private readonly prisma: PrismaService) {}

  getFollowedInstructorWhere(studentId: string): Prisma.UserWhereInput {
    return {
      followedByStudents: {
        some: {
          studentId
        }
      }
    };
  }

  async getAccessiblePublishedCourseForStudent<T extends Prisma.CourseSelect>(
    studentId: string,
    courseId: string,
    select: T
  ): Promise<Prisma.CourseGetPayload<{ select: T }> | null> {
    return this.prisma.course.findFirst({
      where: {
        id: courseId,
        status: CourseStatus.PUBLISHED,
        instructor: this.getFollowedInstructorWhere(studentId)
      },
      select
    }) as Promise<Prisma.CourseGetPayload<{ select: T }> | null>;
  }
}
