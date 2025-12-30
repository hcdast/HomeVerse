import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiToolProvider, AiToolType, AiToolParams, AiToolResult } from '../interfaces/ai-tool.interface';

@Injectable()
export class ChatGptAgentTool implements AiToolProvider {
  private readonly logger = new Logger(ChatGptAgentTool.name);
  private openai: OpenAI | null = null;
  private agents: Map<string, any> = new Map();

  constructor(private configService: ConfigService) {
    this.initialize();
  }

  private initialize() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      const config: any = {
        apiKey,
        timeout: 120000,
        maxRetries: 2,
      };

      const proxy = this.configService.get<string>('HTTPS_PROXY');
      if (proxy) {
        try {
          const { HttpsProxyAgent } = require('https-proxy-agent');
          config.httpAgent = new HttpsProxyAgent(proxy);
          config.httpsAgent = config.httpAgent;
        } catch (error) {
          this.logger.warn('代理配置失败');
        }
      }

      this.openai = new OpenAI(config);
      this.logger.log('ChatGPT Agent 工具已初始化');
    }
  }

  getName(): string {
    return 'ChatGPT Agent';
  }

  getType(): AiToolType {
    return AiToolType.CHAT_AGENT;
  }

  isConfigured(): boolean {
    return this.openai !== null;
  }

  async execute(params: AiToolParams): Promise<AiToolResult> {
    if (!this.isConfigured()) {
      throw new Error('ChatGPT Agent 未配置');
    }

    try {
      const startTime = Date.now();

      // 构建消息
      const messages = params.messages || [
        {
          role: 'user',
          content: params.prompt,
        },
      ];

      // 如果有 functions，使用 function calling
      const completionParams: any = {
        model: params.model || 'gpt-4-turbo-preview',
        messages,
        temperature: 0.7,
      };

      if (params.functions && params.functions.length > 0) {
        completionParams.tools = params.functions.map(func => ({
          type: 'function',
          function: func,
        }));
        completionParams.tool_choice = 'auto';
      }

      const completion = await this.openai!.chat.completions.create(completionParams);

      const response = completion.choices[0]?.message;
      const duration = Date.now() - startTime;

      // 检查是否需要调用函数
      if (response.tool_calls && response.tool_calls.length > 0) {
        return {
          success: true,
          message: 'Agent 请求调用函数',
          data: {
            response: response.content || '',
            conversationId: params.conversationId,
            text: JSON.stringify(response.tool_calls),
          },
          metadata: {
            model: completionParams.model,
            provider: 'OpenAI',
            duration,
          },
        };
      }

      return {
        success: true,
        message: '对话成功',
        data: {
          response: response.content || '',
          conversationId: params.conversationId || this.generateConversationId(),
          text: response.content || '',
        },
        metadata: {
          model: completionParams.model,
          provider: 'OpenAI',
          duration,
        },
      };
    } catch (error: any) {
      this.logger.error('ChatGPT Agent 执行失败:', error);
      throw new Error(`Agent 执行失败: ${error.message}`);
    }
  }

  // 创建专用 Agent
  async createAgent(name: string, instructions: string, functions?: any[]): Promise<string> {
    const agentId = this.generateAgentId();
    
    this.agents.set(agentId, {
      id: agentId,
      name,
      instructions,
      functions: functions || [],
      createdAt: new Date(),
    });

    this.logger.log(`Agent 已创建: ${name} (${agentId})`);
    return agentId;
  }

  // 获取 Agent 信息
  getAgent(agentId: string): any {
    return this.agents.get(agentId);
  }

  // 列出所有 Agents
  listAgents(): any[] {
    return Array.from(this.agents.values());
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

