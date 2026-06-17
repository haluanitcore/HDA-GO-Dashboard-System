import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { CmCreatorsService } from './cm-creators.service';
import {
  OnboardCreatorDto,
  UpdateCreatorDto,
  TransferCreatorDto,
} from './dto/cm-creators.dto';

@Controller('cm/creators')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CmCreatorsController {
  constructor(private readonly cmCreatorsService: CmCreatorsService) {}

  // POST /cm/creators/onboard — CM mendaftarkan creator baru
  @Post('onboard')
  @Roles(Role.CM, Role.ADMIN)
  onboardCreator(@Req() req: any, @Body() dto: OnboardCreatorDto) {
    return this.cmCreatorsService.onboardCreator(req.user.userId, dto);
  }

  // GET /cm/creators — Daftar semua creator milik CM ini
  @Get()
  @Roles(Role.CM, Role.ADMIN)
  getMyCreators(@Req() req: any) {
    return this.cmCreatorsService.getMyCreators(req.user.userId);
  }

  // GET /cm/creators/list-all-cms — Daftar semua CM (untuk dropdown transfer)
  @Get('list-all-cms')
  @Roles(Role.CM, Role.ADMIN)
  getCMList() {
    return this.cmCreatorsService.getCMList();
  }

  // GET /cm/creators/:id — Detail creator
  @Get(':id')
  @Roles(Role.CM, Role.ADMIN)
  getCreatorDetail(@Param('id') creatorId: string) {
    return this.cmCreatorsService.getCreatorDetail(creatorId);
  }

  // PATCH /cm/creators/:id — Edit biodata creator
  @Patch(':id')
  @Roles(Role.CM, Role.ADMIN)
  updateCreator(@Param('id') creatorId: string, @Body() dto: UpdateCreatorDto) {
    return this.cmCreatorsService.updateCreator(creatorId, dto);
  }

  // POST /cm/creators/:id/transfer — Transfer creator ke CM lain
  @Post(':id/transfer')
  @Roles(Role.CM, Role.ADMIN)
  transferCreator(
    @Req() req: any,
    @Param('id') creatorId: string,
    @Body() dto: TransferCreatorDto,
  ) {
    return this.cmCreatorsService.transferCreator(
      creatorId,
      req.user.userId,
      dto.target_cm_id,
      dto.reason,
    );
  }
}
