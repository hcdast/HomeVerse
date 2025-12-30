import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

/**
 * MinIO 对象存储服务
 * 负责所有文件的上传、下载和管理
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private minioClient: Minio.Client;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;
  private readonly publicUrl: string;

  constructor(private configService: ConfigService) {
    // MinIO 配置
    this.endpoint = this.configService.get<string>('MINIO_ENDPOINT', '115.190.245.230');
    this.port = parseInt(this.configService.get<string>('MINIO_PORT', '9000'), 10);
    // 环境变量是字符串，需要显式转换为布尔值
    const useSSLValue = this.configService.get<string>('MINIO_USE_SSL', 'false');
    this.useSSL = useSSLValue === 'true' || useSSLValue === '1';
    this.bucketName = this.configService.get<string>('MINIO_BUCKET', 'homeverse');
    
    // 公网访问地址
    this.publicUrl = `http${this.useSSL ? 's' : ''}://${this.endpoint}:${this.port}`;

    // 初始化 MinIO 客户端
    this.minioClient = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey: this.configService.get<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get<string>('MINIO_SECRET_KEY'),
    });

    this.logger.log('MinIO 存储服务已初始化');
    this.logger.log(`端点: ${this.endpoint}:${this.port}`);
    this.logger.log(`存储桶: ${this.bucketName}`);
  }

  /**
   * 模块初始化时检查并创建存储桶
   */
  async onModuleInit() {
    try {
      await this.ensureBucketExists();
      this.logger.log('✅ MinIO 存储服务已就绪');
    } catch (error) {
      this.logger.error('❌ MinIO 初始化失败:', error.message);
      this.logger.warn('文件上传功能可能不可用');
    }
  }

  /**
   * 确保存储桶存在，不存在则创建
   */
  private async ensureBucketExists(): Promise<void> {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        this.logger.log(`创建存储桶: ${this.bucketName}`);
        await this.minioClient.makeBucket(this.bucketName, 'us-east-1');
        this.logger.log(`✅ 存储桶 ${this.bucketName} 创建成功`);
      } else {
        this.logger.log(`✅ 存储桶 ${this.bucketName} 已存在`);
      }
      
      // 始终确保存储桶为公开读取（每次启动都检查并设置）
      await this.ensureBucketPublicAccess();
    } catch (error) {
      this.logger.error('检查/创建存储桶失败:', error);
      throw error;
    }
  }

  /**
   * 确保存储桶设置为公开访问
   */
  private async ensureBucketPublicAccess(): Promise<void> {
    try {
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };
      await this.minioClient.setBucketPolicy(
        this.bucketName,
        JSON.stringify(policy),
      );
      this.logger.log(`✅ 存储桶 ${this.bucketName} 已设置为公开访问`);
    } catch (error) {
      this.logger.error('设置存储桶公开访问策略失败:', error);
      // 不抛出错误，允许服务继续运行（文件可能通过预签名URL访问）
    }
  }

  /**
   * 获取当前日期文件夹名称（YYYYMMDD 格式）
   */
  private getDateFolder(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * 上传文件
   * @param file Express.Multer.File 对象
   * @param folder 功能模块文件夹（如 photos, files, ai-images 等）
   * @returns 文件的公网访问 URL
   * 
   * 文件将按以下结构存储：{folder}/{YYYYMMDD}/{filename}
   * 例如：photos/20251230/abc123.jpg
   */
  /**
   * 修复文件名编码问题
   * Multer 默认使用 Latin-1 编码解析文件名，中文会乱码
   * 需要将 Latin-1 转换为 UTF-8
   */
  private fixFilenameEncoding(filename: string): string {
    try {
      // 尝试将 Latin-1 编码转换为 UTF-8
      const buffer = Buffer.from(filename, 'latin1');
      const utf8Name = buffer.toString('utf8');
      // 如果转换后包含有效的中文字符，使用转换后的名称
      if (/[\u4e00-\u9fa5]/.test(utf8Name)) {
        return utf8Name;
      }
      // 否则返回原始名称（可能本来就是 ASCII）
      return filename;
    } catch {
      return filename;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads',
  ): Promise<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    path: string;
  }> {
    try {
      // 修复文件名编码
      const originalName = this.fixFilenameEncoding(file.originalname);
      
      // 生成唯一文件名
      const ext = path.extname(originalName);
      const filename = `${uuidv4()}${ext}`;
      
      // 按功能模块和日期组织文件夹：{folder}/{YYYYMMDD}/{filename}
      const dateFolder = this.getDateFolder();
      const objectName = `${folder}/${dateFolder}/${filename}`;

      // 上传文件
      this.logger.log(`上传文件到 MinIO: ${objectName}, 原始文件名: ${originalName}`);
      await this.minioClient.putObject(
        this.bucketName,
        objectName,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
          'Original-Name': Buffer.from(originalName).toString('base64'),
        },
      );

      // 生成公网访问 URL
      const url = `${this.publicUrl}/${this.bucketName}/${objectName}`;

      this.logger.log(`✅ 文件上传成功: ${url}`);

      return {
        url,
        filename,
        originalName,
        size: file.size,
        mimeType: file.mimetype,
        path: objectName,
      };
    } catch (error) {
      this.logger.error('上传文件失败:', error);
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 批量上传文件
   */
  async uploadFiles(
    files: Express.Multer.File[],
    folder: string = 'uploads',
  ): Promise<Array<{
    url: string;
    filename: string;
    originalName: string;
    size: number;
    mimeType: string;
    path: string;
  }>> {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file, folder)),
    );
    return results;
  }

  /**
   * 删除文件
   * @param objectPath 对象路径（相对于 bucket）
   */
  async deleteFile(objectPath: string): Promise<void> {
    try {
      this.logger.log(`删除文件: ${objectPath}`);
      await this.minioClient.removeObject(this.bucketName, objectPath);
      this.logger.log(`✅ 文件删除成功: ${objectPath}`);
    } catch (error) {
      this.logger.error('删除文件失败:', error);
      throw new Error(`删除文件失败: ${error.message}`);
    }
  }

  /**
   * 批量删除文件
   */
  async deleteFiles(objectPaths: string[]): Promise<void> {
    try {
      this.logger.log(`批量删除 ${objectPaths.length} 个文件`);
      const objectsList = objectPaths.map((path) => path);
      await this.minioClient.removeObjects(this.bucketName, objectsList);
      this.logger.log(`✅ 批量删除成功`);
    } catch (error) {
      this.logger.error('批量删除文件失败:', error);
      throw new Error(`批量删除文件失败: ${error.message}`);
    }
  }

  /**
   * 获取文件下载 URL（预签名 URL，有时效性）
   * @param objectPath 对象路径
   * @param expirySeconds 过期时间（秒），默认 7 天
   */
  async getPresignedUrl(
    objectPath: string,
    expirySeconds: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      const url = await this.minioClient.presignedGetObject(
        this.bucketName,
        objectPath,
        expirySeconds,
      );
      return url;
    } catch (error) {
      this.logger.error('生成预签名 URL 失败:', error);
      throw new Error(`生成下载链接失败: ${error.message}`);
    }
  }

  /**
   * 获取公网访问 URL（永久有效，需要 bucket 设置为公开）
   */
  getPublicUrl(objectPath: string): string {
    return `${this.publicUrl}/${this.bucketName}/${objectPath}`;
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(objectPath: string): Promise<boolean> {
    try {
      await this.minioClient.statObject(this.bucketName, objectPath);
      return true;
    } catch (error) {
      if (error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * 列出文件夹中的所有文件
   */
  async listFiles(
    prefix: string = '',
  ): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    return new Promise((resolve, reject) => {
      const files: Array<{ name: string; size: number; lastModified: Date }> = [];
      const stream = this.minioClient.listObjects(
        this.bucketName,
        prefix,
        true,
      );

      stream.on('data', (obj) => {
        if (obj.name) {
          files.push({
            name: obj.name,
            size: obj.size,
            lastModified: obj.lastModified,
          });
        }
      });

      stream.on('error', (err) => {
        this.logger.error('列出文件失败:', err);
        reject(err);
      });

      stream.on('end', () => {
        resolve(files);
      });
    });
  }

  /**
   * 从 URL 提取对象路径
   * 例如：http://115.190.245.230:9000/homeverse/uploads/xxx.jpg -> uploads/xxx.jpg
   */
  extractObjectPath(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // 移除第一个空字符串和 bucket 名称
      pathParts.shift();
      if (pathParts[0] === this.bucketName) {
        pathParts.shift();
      }
      return pathParts.join('/');
    } catch (error) {
      this.logger.warn(`无法从 URL 提取对象路径: ${url}`);
      return null;
    }
  }

  /**
   * 复制文件
   */
  async copyFile(sourcePath: string, destPath: string): Promise<string> {
    try {
      const copyConditions = new Minio.CopyConditions();
      await this.minioClient.copyObject(
        this.bucketName,
        destPath,
        `/${this.bucketName}/${sourcePath}`,
        copyConditions,
      );
      return this.getPublicUrl(destPath);
    } catch (error) {
      this.logger.error('复制文件失败:', error);
      throw new Error(`复制文件失败: ${error.message}`);
    }
  }
}

