import {
  ArrayNotEmpty,
  IsArray,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AssignUserRolesDto {
  @ValidateIf((o: AssignUserRolesDto) => !o.roleCode)
  @IsArray()
  @ArrayNotEmpty()
  roleIds?: string[];

  @ValidateIf((o: AssignUserRolesDto) => !o.roleIds?.length)
  @IsString()
  @MinLength(1)
  roleCode?: string;
}
