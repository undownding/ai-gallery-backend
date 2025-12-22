import { Controller, MessageEvent, Param, Sse } from '@nestjs/common'
import { Observable } from 'rxjs'
import { TaskService } from './task.service'

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Sse('gemini/:taskId/sse')
  streamGeminiTask(@Param('taskId') taskId: string): Observable<MessageEvent> {
    return this.taskService.streamGeminiTask(taskId)
  }
}
