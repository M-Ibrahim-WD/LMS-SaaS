import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Min,
  ValidateNested
} from "class-validator";

class ReorderSectionItemDto {
  @IsString()
  id!: string;

  @IsInt()
  @Min(1)
  order!: number;
}

export class ReorderSectionsDto {
  @IsString()
  courseId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderSectionItemDto)
  items!: ReorderSectionItemDto[];
}

