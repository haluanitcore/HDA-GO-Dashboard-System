import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Requires auth — unauthenticated callers must not see the API endpoint map (CWE-200)
  @Get()
  @UseGuards(AuthGuard('jwt'))
  getHealth() {
    return this.appService.getHealth();
  }
}
