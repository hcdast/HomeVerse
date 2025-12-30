import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { QwenProvider } from './providers/qwen.provider';
import { AiToolsService } from './ai-tools.service';
import { AiToolsController } from './ai-tools.controller';
import { AiTaskService } from './ai-task.service';
import { WavespeedTaskService } from './wavespeed-task.service';
import { ChatGptAgentTool } from './tools/chatgpt-agent.tool';
import { TextToImageTool } from './tools/text-to-image.tool';
import { ImageToImageTool } from './tools/image-to-image.tool';
import { VideoGenerationTool } from './tools/video-generation.tool';
import { ImageToVideoTool } from './tools/image-to-video.tool';
import { CharacterFaceswapTool } from './tools/character-faceswap.tool';
import { AiTask, AiTaskSchema } from './schemas/ai-task.schema';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    ConfigModule,
    StorageModule,
    MongooseModule.forFeature([
      { name: AiTask.name, schema: AiTaskSchema },
    ]),
  ],
  controllers: [
    AiController,
    AiToolsController,
  ],
  providers: [
    // AI 文本生成
    AiService,
    OpenAiProvider,
    ClaudeProvider,
    GeminiProvider,
    QwenProvider,
    // AI 工具服务
    AiToolsService,
    AiTaskService,
    WavespeedTaskService,
    // AI 工具
    ChatGptAgentTool,
    TextToImageTool,
    ImageToImageTool,
    VideoGenerationTool,
    ImageToVideoTool,
    CharacterFaceswapTool,
  ],
  exports: [AiService, AiToolsService, AiTaskService, WavespeedTaskService],
})
export class AiModule {}
