import { IsEmail, IsEnum, IsOptional, IsObject } from 'class-validator';
import { UserRole } from '../../common/enums/role.enum';

export class InviteMemberDto {
  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class UpdateMemberPermissionsDto {
  @IsObject()
  @IsOptional()
  permissions?: {
    albums?: { read: boolean; write: boolean; delete: boolean };
    files?: { read: boolean; write: boolean; delete: boolean };
    articles?: { read: boolean; write: boolean; delete: boolean };
    members?: { read: boolean; write: boolean; delete: boolean };
  };
}

