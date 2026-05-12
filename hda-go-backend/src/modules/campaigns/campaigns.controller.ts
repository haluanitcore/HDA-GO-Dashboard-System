import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { Roles } from '../../common/roles.decorator';
import { Role } from '../../common/roles.enum';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, JoinCampaignDto } from './dto/campaign.dto';

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  // POST /campaigns — Create campaign (Brand/Admin/CM)
  @Post()
  @Roles(Role.BRAND, Role.ADMIN, Role.CM)
  create(@Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(dto);
  }

  // PATCH /campaigns/:id/publish — Publish + Broadcast (CM/Admin)
  @Patch(':id/publish')
  @Roles(Role.CM, Role.ADMIN)
  publish(@Param('id') id: string) {
    return this.campaignsService.publish(id);
  }

  // POST /campaigns/join — Creator joins campaign (with level + slot check)
  @Post('join')
  @Roles(Role.CREATOR)
  join(@Req() req: any, @Body() dto: JoinCampaignDto) {
    return this.campaignsService.joinCampaign(req.user.userId, dto);
  }

  // GET /campaigns/hub — Creator campaign hub (with eligibility)
  @Get('hub')
  @Roles(Role.CREATOR)
  getCampaignHub(@Req() req: any, @Query('category') category?: string) {
    return this.campaignsService.findForCreator(req.user.userId, category);
  }

  // GET /campaigns/categories — List categories
  @Get('categories')
  getCategories() {
    return this.campaignsService.getCategories();
  }

  // GET /campaigns?status=ACTIVE&category=HOTEL — List campaigns
  @Get()
  findAll(@Req() req: any, @Query('status') status?: string, @Query('category') category?: string) {
    return this.campaignsService.findAll({ status, category }, req.user);
  }

  // GET /campaigns/:id — Campaign detail
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }
}
