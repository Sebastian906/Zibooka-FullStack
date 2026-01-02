import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Status')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Check API status' })
  @ApiResponse({ status: 200, description: 'API is running successfully.' })
  getStatus(): string {
    return this.appService.getStatus();
  }
}
