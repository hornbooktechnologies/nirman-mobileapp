import { Injectable } from '@nestjs/common';
import { DEFAULT_APP_NAME } from '@nirman-app/shared';
import { DatabaseService } from './database/database.service';

@Injectable()
export class AppService {
  constructor(private readonly database: DatabaseService) {}

  async getHealth() {
    await this.database.ping();

    return {
      app: DEFAULT_APP_NAME,
      status: 'ok',
      database: 'ok',
    };
  }
}
