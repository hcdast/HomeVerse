import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @IsNotEmpty()
  folderName: string;

  @IsString()
  @IsOptional()
  parentPath?: string; // 父文件夹路径，默认为根目录 '/'
}

export class MoveFolderDto {
  @IsString()
  @IsNotEmpty()
  targetPath: string; // 目标路径
}

export class RenameFolderDto {
  @IsString()
  @IsNotEmpty()
  newName: string;
}

