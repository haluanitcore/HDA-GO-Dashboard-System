import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      name: 'HDA Go Backend API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      endpoints: {
        auth: {
          login: 'POST /api/auth/login',
          register: 'POST /api/auth/register',
          profile: 'GET /api/auth/profile',
        },
        creators: {
          dashboard: 'GET /api/creators/dashboard',
          list: 'GET /api/creators',
        },
        campaigns: {
          list: 'GET /api/campaigns',
          detail: 'GET /api/campaigns/:id',
        },
        analytics: {
          kpi: 'GET /api/analytics/kpi',
          gmvSummary: 'GET /api/analytics/gmv-summary',
        },
        cm: {
          dashboard: 'GET /api/cm/dashboard',
          pipeline: 'GET /api/cm/pipeline',
        },
        rewards: {
          my: 'GET /api/rewards/my',
        },
      },
    };
  }
}
