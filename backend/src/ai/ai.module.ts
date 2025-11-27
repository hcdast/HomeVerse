import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { OpenAiProvider } from './providers/openai.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { QwenProvider } from './providers/qwen.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AiController],
  providers: [
    AiService,
    OpenAiProvider,
    ClaudeProvider,
    GeminiProvider,
    QwenProvider,
  ],
  exports: [AiService],
})
export class AiModule {}
