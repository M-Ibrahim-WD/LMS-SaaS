import { Transform } from "class-transformer";
import { IsString, MaxLength } from "class-validator";

export class CreatePaymentDto {
  @Transform(({ value, obj }) => value ?? obj?.course_id)
  @IsString()
  @MaxLength(191)
  courseId!: string;

  @Transform(({ value, obj }) => value ?? obj?.method_id)
  @IsString()
  @MaxLength(191)
  methodId!: string;
}
