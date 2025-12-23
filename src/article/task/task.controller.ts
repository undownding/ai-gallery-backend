import { Body, Controller, MessageEvent, Param, Post, Sse } from '@nestjs/common'
import { Observable } from 'rxjs'
import { TaskService } from './task.service'
import { NeedLogin } from '../../user/need-login.decorator'
import { Me } from '../../user/me.decorator'
import { User } from '../../user/user.entity'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { ApiSummary } from '../../common/nestjs-ext'
import { GeminiTaskCreateDto, GeminiTaskCreateResponseDto } from './dto/gemini-task-create.dto'

@Controller('task')
@ApiTags('Task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('gemini')
  @NeedLogin()
  @ApiSummary('创建 Gemini 生成任务')
  @ApiOkResponse({ type: () => GeminiTaskCreateResponseDto })
  async createGeminiTask(
    @Body() body: GeminiTaskCreateDto,
    @Me() me: User
  ): Promise<GeminiTaskCreateResponseDto> {
    const taskId = await this.taskService.createGeminiTask(body, me.id)
    return { taskId }
  }

  @Sse('gemini/:taskId/sse')
  @ApiSummary('订阅 Gemini 任务的 SSE 进度')
  streamGeminiTask(@Param('taskId') taskId: string): Observable<MessageEvent> {
    return this.taskService.streamGeminiTask(taskId)
  }
}
