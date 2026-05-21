import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { CmCreatorsService } from './cm-creators.service';

@Controller('cm/creators')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CmCreatorsController {
  constructor(private readonly cmCreatorsService: CmCreatorsService) {}

  @Post('onboard')
  @Roles(Role.CM, Role.ADMIN)
  onboardCreator(@Req() req: any, @Body() body: any) {
    return this.cmCreatorsService.onboardCreator(req.user.userId, body);
  }

  @Get()
  @Roles(Role.CM, Role.ADMIN)
  getMyCreators(@Req() req: any) {
    return this.cmCreatorsService.getMyCreators(req.user.userId);
  }

  @Get('list-all-cms')
  @Roles(Role.CM, Role.ADMIN)
  getCMList() {
    return this.cmCreatorsService.getCMList();
  }

  @Get(':id')
  @Roles(Role.CM, Role.ADMIN)
  getCreatorDetail(@Req() req: any, @Param('id') creatorId: string) {
    return this.cmCreatorsService.getCreatorDetail(creatorId, req.user.userId);
  }

  @Patch(':id')
  @Roles(Role.CM, Role.ADMIN)
  updateCreator(@Req() req: any, @Param('id') creatorId: string, @Body() body: any) {
    return this.cmCreatorsService.updateCreator(creatorId, req.user.userId, body);
  }

  @Post(':id/transfer')
  @Roles(Role.CM, Role.ADMIN)
  transferCreator(
    @Req() req: any, 
    @Param('id') creatorId: string, 
    @Body() body: { target_cm_id: string; reason: string }
  ) {
    return this.cmCreatorsService.transferCreator(
      creatorId, 
      req.user.userId, 
      body.target_cm_id, 
      body.reason
    );
  }
}
