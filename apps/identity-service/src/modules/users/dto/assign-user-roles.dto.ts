import {
  ArrayNotEmpty,
  IsArray,
  IsString,
  IsUUID,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AssignUserRolesDto {
  @ValidateIf((o: AssignUserRolesDto) => !o.roleCode)
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  roleIds?: string[];

  @ValidateIf((o: AssignUserRolesDto) => !o.roleIds?.length)
  @IsString()
  @MinLength(1)
  roleCode?: string;
}
