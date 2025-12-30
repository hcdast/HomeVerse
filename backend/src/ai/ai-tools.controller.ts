import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  Param,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiToolsService } from './ai-tools.service';
import { AiTaskService } from './ai-task.service';
import { StorageService } from '../storage/storage.service';
import { AiToolType, ImageModel, VideoModel } from './interfaces/ai-tool.interface';

@Controller('ai/tools')
@UseGuards(JwtAuthGuard)
export class AiToolsController {
  private readonly logger = new Logger(AiToolsController.name);

  constructor(
    private readonly aiToolsService: AiToolsService,
    private readonly aiTaskService: AiTaskService,
    private readonly storageService: StorageService,
  ) {}

  // 获取所有可用工具（不需要认证，用于测试）
  @Get()
  getTools() {
    try {
      return {
        success: true,
        tools: this.aiToolsService.getAvailableTools(),
        statistics: this.aiToolsService.getStatistics(),
      };
    } catch (error: any) {
      this.logger.error('获取工具列表失败:', error);
      throw error;
    }
  }

  // ChatGPT Agent - 对话
  @Post('chat-agent')
  async chatAgent(@Body() body: {
    prompt?: string;
    messages?: any[];
    agentId?: string;
    conversationId?: string;
    model?: string;
  }) {
    try {
      const result = await this.aiToolsService.executeTool(AiToolType.CHAT_AGENT, {
        prompt: body.prompt,
        messages: body.messages,
        agentId: body.agentId,
        conversationId: body.conversationId,
        model: body.model || 'gpt-4-turbo-preview',
      });

      return result;
    } catch (error: any) {
      this.logger.error('ChatGPT Agent 执行失败:', error);
      throw error;
    }
  }

  // 创建 Agent
  @Post('chat-agent/create')
  async createAgent(@Body() body: {
    name: string;
    instructions: string;
    functions?: any[];
  }) {
    try {
      const agentId = await this.aiToolsService.createAgent(
        body.name,
        body.instructions,
        body.functions,
      );

      return {
        success: true,
        message: 'Agent 创建成功',
        agentId,
      };
    } catch (error: any) {
      this.logger.error('创建 Agent 失败:', error);
      throw error;
    }
  }

  // 获取 Agent 列表
  @Get('chat-agent/list')
  async listAgents() {
    const agents = await this.aiToolsService.listAgents();
    return { agents };
  }

  // 文本生成图像
  @Post('text-to-image')
  async textToImage(
    @Body() body: {
      prompt: string;
      model?: ImageModel;
      width?: number;
      height?: number;
      steps?: number;
      seed?: number;
      guidanceScale?: number;
      negativePrompt?: string;
    },
    @Request() req,
  ) {
    try {
      this.logger.log(`文本生成图像: ${body.prompt.substring(0, 50)}...`);
      
      // 创建任务记录
      const task = await this.aiTaskService.createTask({
        userId: req.user.userId,
        familyId: req.user.familyId,
        toolType: AiToolType.TEXT_TO_IMAGE,
        params: body,
      });

      // 更新为处理中
      await this.aiTaskService.updateTaskStatus(task.taskId, 'processing');

      try {
        // 执行工具
        const result = await this.aiToolsService.executeTool(AiToolType.TEXT_TO_IMAGE, {
          prompt: body.prompt,
          model: body.model || ImageModel.FLUX_2_FLEX,
          width: body.width,
          height: body.height,
          steps: body.steps,
          seed: body.seed,
          guidanceScale: body.guidanceScale,
          negativePrompt: body.negativePrompt,
        });

        // 如果是异步任务，保存远程任务ID
        if (result.data?.taskId) {
          await this.aiTaskService.updateTaskStatus(task.taskId, 'processing', {
            metadata: { 
              ...result.metadata,
              remoteTaskId: result.data.taskId, // 保存 Wavespeed 的 request_id
            },
          });
          
          // 更新 remoteTaskId 字段
          await this.aiTaskService.updateRemoteTaskId(task.taskId, result.data.taskId);
        }

        // 如果直接返回了结果（同步）
        if (result.success && result.data?.imageUrls) {
          await this.aiTaskService.updateTaskStatus(task.taskId, 'completed', {
            result: result.data,
            metadata: result.metadata,
            progress: 100,
          });
        }

        return {
          ...result,
          taskId: task.taskId, // 返回我们的任务ID
        };
      } catch (error: any) {
        // 更新任务为失败
        await this.aiTaskService.updateTaskStatus(task.taskId, 'failed', {
          errorMessage: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error('文本生成图像失败:', error);
      throw error;
    }
  }

  // 图像转换
  @Post('image-to-image')
  @UseInterceptors(FileInterceptor('image'))
  async imageToImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      prompt?: string;
      model?: string;
      imageUrl?: string;
      negativePrompt?: string;
      steps?: number;
      seed?: number;
      guidanceScale?: number;
    },
    @Request() req,
  ) {
    try {
      this.logger.log('图像转换任务开始');
      
      // 创建任务记录
      const task = await this.aiTaskService.createTask({
        userId: req.user.userId,
        familyId: req.user.familyId,
        toolType: AiToolType.IMAGE_TO_IMAGE,
        params: { ...body, hasFile: !!file },
      });

      await this.aiTaskService.updateTaskStatus(task.taskId, 'processing');

      try {
        // 获取图片数据
        let imageData: string;
        
        if (file) {
          // 如果有文件上传，转换为 base64 data URL（因为外部 API 无法访问本地 MinIO）
          this.logger.log('将图片转换为 Base64...');
          const base64 = file.buffer.toString('base64');
          const mimeType = file.mimetype || 'image/png';
          imageData = `data:${mimeType};base64,${base64}`;
          this.logger.log(`图片 Base64 转换成功，大小: ${Math.round(base64.length / 1024)}KB`);
        } else if (body.imageUrl) {
          // 如果是外部 URL，直接使用
          imageData = body.imageUrl;
          this.logger.log(`使用外部图片 URL: ${imageData}`);
        } else {
          throw new Error('需要提供图片 URL 或上传图片文件');
        }

        const result = await this.aiToolsService.executeTool(AiToolType.IMAGE_TO_IMAGE, {
          imageUrl: imageData,
          prompt: body.prompt,
          model: body.model,
          negativePrompt: body.negativePrompt,
          steps: body.steps ? parseInt(body.steps.toString()) : undefined,
          seed: body.seed ? parseInt(body.seed.toString()) : undefined,
          guidanceScale: body.guidanceScale ? parseFloat(body.guidanceScale.toString()) : undefined,
        });

        // 保存远程任务ID
        if (result.data?.taskId) {
          await this.aiTaskService.updateRemoteTaskId(task.taskId, result.data.taskId);
        }

        // 如果直接返回了结果
        if (result.success && result.data?.imageUrls) {
          await this.aiTaskService.updateTaskStatus(task.taskId, 'completed', {
            result: result.data,
            metadata: result.metadata,
            progress: 100,
          });
        }

        return {
          ...result,
          taskId: task.taskId,
        };
      } catch (error: any) {
        await this.aiTaskService.updateTaskStatus(task.taskId, 'failed', {
          errorMessage: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error('图像转换失败:', error);
      throw error;
    }
  }

  // 文本生成视频
  @Post('text-to-video')
  async textToVideo(
    @Body() body: {
      prompt: string;
      model?: VideoModel;
      duration?: number;
      fps?: number;
      negativePrompt?: string;
    },
    @Request() req,
  ) {
    try {
      this.logger.log(`文本生成视频: ${body.prompt.substring(0, 50)}...`);
      
      // 创建任务记录
      const task = await this.aiTaskService.createTask({
        userId: req.user.userId,
        familyId: req.user.familyId,
        toolType: AiToolType.TEXT_TO_VIDEO,
        params: body,
      });

      await this.aiTaskService.updateTaskStatus(task.taskId, 'processing');

      try {
        const result = await this.aiToolsService.executeTool(AiToolType.TEXT_TO_VIDEO, {
          prompt: body.prompt,
          model: body.model,
          duration: body.duration,
          fps: body.fps,
          negativePrompt: body.negativePrompt,
        });

        if (result.data?.taskId) {
          await this.aiTaskService.updateRemoteTaskId(task.taskId, result.data.taskId);
        }

        if (result.success && result.data?.videoUrl) {
          await this.aiTaskService.updateTaskStatus(task.taskId, 'completed', {
            result: result.data,
            metadata: result.metadata,
            progress: 100,
          });
        }

        return {
          ...result,
          taskId: task.taskId,
        };
      } catch (error: any) {
        await this.aiTaskService.updateTaskStatus(task.taskId, 'failed', {
          errorMessage: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error('文本生成视频失败:', error);
      throw error;
    }
  }

  // 图像生成视频
  @Post('image-to-video')
  @UseInterceptors(FileInterceptor('image'))
  async imageToVideo(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      prompt?: string;
      model?: VideoModel;
      imageUrl?: string;
      duration?: number;
      resolution?: string;
      aspectRatio?: string;
      fps?: number;
      motionStrength?: number;
      negativePrompt?: string;
      seed?: number;
      generateAudio?: boolean;
    },
    @Request() req,
  ) {
    try {
      this.logger.log('图像生成视频任务开始');
      
      // 获取图片数据
      let imageData: string;
      
      if (file) {
        // 如果有文件上传，转换为 base64 data URL（因为外部 API 无法访问本地 MinIO）
        this.logger.log('将图片转换为 Base64...');
        const base64 = file.buffer.toString('base64');
        const mimeType = file.mimetype || 'image/png';
        imageData = `data:${mimeType};base64,${base64}`;
        this.logger.log(`图片 Base64 转换成功，大小: ${Math.round(base64.length / 1024)}KB`);
      } else if (body.imageUrl) {
        // 如果是外部 URL，直接使用
        imageData = body.imageUrl;
        this.logger.log(`使用外部图片 URL: ${imageData}`);
      } else {
        throw new Error('需要提供图片 URL 或上传图片文件');
      }

      // 创建任务记录
      const task = await this.aiTaskService.createTask({
        userId: req.user.userId,
        familyId: req.user.familyId,
        toolType: AiToolType.IMAGE_TO_VIDEO,
        params: { ...body, hasImage: !!file },
      });

      await this.aiTaskService.updateTaskStatus(task.taskId, 'processing');

      try {
        const result = await this.aiToolsService.executeTool(AiToolType.IMAGE_TO_VIDEO, {
          imageUrl: imageData,
          prompt: body.prompt,
          model: body.model || VideoModel.SEEDANCE_PRO_I2V_720P,
          duration: body.duration ? parseInt(body.duration.toString()) : 5,
          resolution: body.resolution,
          aspectRatio: body.aspectRatio,
          fps: body.fps ? parseInt(body.fps.toString()) : undefined,
          motionStrength: body.motionStrength ? parseFloat(body.motionStrength.toString()) : undefined,
          negativePrompt: body.negativePrompt,
          seed: body.seed ? parseInt(body.seed.toString()) : undefined,
          generateAudio: body.generateAudio,
        });

        // 保存远程任务 ID
        if (result.data?.taskId) {
          await this.aiTaskService.updateRemoteTaskId(task.taskId, result.data.taskId);
        }

        // 如果任务已完成
        if (result.success && result.data?.videoUrl) {
          await this.aiTaskService.updateTaskStatus(task.taskId, 'completed', {
            result: result.data,
            metadata: result.metadata,
            progress: 100,
          });
        }

        return {
          ...result,
          taskId: task.taskId,
        };
      } catch (error: any) {
        await this.aiTaskService.updateTaskStatus(task.taskId, 'failed', {
          errorMessage: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error('图像生成视频失败:', error);
      throw error;
    }
  }

  // 角色换脸
  @Post('character-faceswap')
  @UseInterceptors(FileInterceptor('image'))
  async characterFaceswap(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: {
      imageUrl?: string;
      videoUrl?: string;
      prompt?: string;
      model?: string;
      resolution?: string;
      mode?: 'animate' | 'replace';
    },
    @Request() req,
  ) {
    try {
      this.logger.log('角色换脸任务开始');
      
      // 获取图片数据
      let imageData: string | undefined;
      
      if (file) {
        // 如果有文件上传，转换为 base64 data URL（因为外部 API 无法访问本地 MinIO）
        this.logger.log('将图片转换为 Base64...');
        const base64 = file.buffer.toString('base64');
        const mimeType = file.mimetype || 'image/png';
        imageData = `data:${mimeType};base64,${base64}`;
        this.logger.log(`图片 Base64 转换成功，大小: ${Math.round(base64.length / 1024)}KB`);
      } else if (body.imageUrl) {
        // 如果是外部 URL，直接使用
        imageData = body.imageUrl;
        this.logger.log(`使用外部图片 URL: ${imageData}`);
      }

      // 创建任务记录
      const task = await this.aiTaskService.createTask({
        userId: req.user.userId,
        familyId: req.user.familyId,
        toolType: AiToolType.CHARACTER_FACESWAP,
        params: { ...body, hasImage: !!file },
      });

      await this.aiTaskService.updateTaskStatus(task.taskId, 'processing');

      try {
        const result = await this.aiToolsService.executeTool(AiToolType.CHARACTER_FACESWAP, {
          imageUrl: imageData,
          videoUrl: body.videoUrl,
          prompt: body.prompt,
          model: body.model || 'wavespeed-ai/wan-2.2/animate',
          resolution: body.resolution || '720p',
          mode: body.mode || 'animate',
        });

        // 保存远程任务 ID
        if (result.data?.taskId) {
          await this.aiTaskService.updateRemoteTaskId(task.taskId, result.data.taskId);
        }

        // 如果任务已完成
        if (result.success && (result.data?.videoUrl || result.data?.imageUrl)) {
          await this.aiTaskService.updateTaskStatus(task.taskId, 'completed', {
            result: result.data,
            metadata: result.metadata,
            progress: 100,
          });
        }

        return {
          ...result,
          taskId: task.taskId,
        };
      } catch (error: any) {
        await this.aiTaskService.updateTaskStatus(task.taskId, 'failed', {
          errorMessage: error.message,
        });
        throw error;
      }
    } catch (error: any) {
      this.logger.error('角色换脸失败:', error);
      throw error;
    }
  }

  // 获取 Wavespeed 任务状态
  @Get('wavespeed/task/:taskId')
  async getWavespeedTaskStatus(@Param('taskId') taskId: string) {
    try {
      const status = await this.aiToolsService.getWavespeedTaskStatus(taskId);
      return {
        success: true,
        status,
      };
    } catch (error: any) {
      this.logger.error('获取任务状态失败:', error);
      throw error;
    }
  }

  // 取消 Wavespeed 任务
  @Delete('wavespeed/task/:taskId')
  async cancelWavespeedTask(@Param('taskId') taskId: string) {
    try {
      await this.aiToolsService.cancelWavespeedTask(taskId);
      return {
        success: true,
        message: '任务已取消',
      };
    } catch (error: any) {
      this.logger.error('取消任务失败:', error);
      throw error;
    }
  }

  // 获取任务详情（包含实时状态）
  @Get('task/:taskId')
  async getTaskDetail(
    @Param('taskId') taskId: string,
    @Query('checkRemote') checkRemote?: string,
  ) {
    try {
      const task = await this.aiTaskService.getTask(taskId);
      
      // 如果任务还在处理中且需要检查远程状态
      if (checkRemote === 'true' && 
          (task.status === 'processing' || task.status === 'pending') &&
          task.remoteTaskId) {
        try {
          // 使用保存的远程任务ID查询状态
          const remoteStatus = await this.aiToolsService.getTaskStatus(
            task.toolType as AiToolType,
            task.remoteTaskId // 使用 Wavespeed 的 request_id
          );
          
          this.logger.log(`任务 ${taskId} 远程状态:`, remoteStatus.status);
          this.logger.log(`远程任务结果:`, JSON.stringify(remoteStatus.result, null, 2));
          
          // 如果远程状态已完成，更新数据库
          if (remoteStatus.status === 'completed' || 
              remoteStatus.status === 'succeeded' || 
              remoteStatus.completed) {
            
            this.logger.log(`更新任务 ${taskId} 为完成状态`);
            
            await this.aiTaskService.updateTaskStatus(taskId, 'completed', {
              result: remoteStatus.result || {},
              progress: 100,
              metadata: {
                ...task.metadata,
                completedAt: new Date(),
              },
            });
            
            // 重新获取更新后的任务
            const updatedTask = await this.aiTaskService.getTask(taskId);
            this.logger.log(`任务已更新，结果:`, JSON.stringify(updatedTask.result, null, 2));
            
            return { success: true, task: updatedTask };
          } else if (remoteStatus.status === 'failed') {
            this.logger.log(`更新任务 ${taskId} 为失败状态`);
            
            await this.aiTaskService.updateTaskStatus(taskId, 'failed', {
              errorMessage: remoteStatus.error || '生成失败',
            });
            
            const updatedTask = await this.aiTaskService.getTask(taskId);
            return { success: true, task: updatedTask };
          } else {
            // 还在处理中
            this.logger.log(`任务 ${taskId} 仍在处理中: ${remoteStatus.status}`);
          }
        } catch (err) {
          this.logger.warn(`检查远程状态失败: ${err.message}`);
        }
      }
      
      return {
        success: true,
        task,
      };
    } catch (error: any) {
      this.logger.error('获取任务详情失败:', error);
      throw error;
    }
  }

  // 获取我的任务列表
  @Get('my-tasks')
  async getMyTasks(
    @Request() req,
    @Query('toolType') toolType?: AiToolType,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const tasks = await this.aiTaskService.getUserTasks(req.user.userId, {
        toolType,
        status,
        limit: limit ? parseInt(limit) : 50,
      });

      return {
        success: true,
        tasks,
        total: tasks.length,
      };
    } catch (error: any) {
      this.logger.error('获取任务列表失败:', error);
      throw error;
    }
  }

  // 获取任务统计
  @Get('statistics')
  async getTaskStatistics(@Request() req) {
    try {
      const stats = await this.aiTaskService.getStatistics(req.user.userId);
      return {
        success: true,
        statistics: stats,
      };
    } catch (error: any) {
      this.logger.error('获取统计信息失败:', error);
      throw error;
    }
  }

  // 删除任务
  @Delete('task/:taskId')
  async deleteTask(@Param('taskId') taskId: string, @Request() req) {
    try {
      await this.aiTaskService.deleteTask(taskId, req.user.userId);
      return {
        success: true,
        message: '任务已删除',
      };
    } catch (error: any) {
      this.logger.error('删除任务失败:', error);
      throw error;
    }
  }
}

