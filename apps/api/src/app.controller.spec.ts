import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { DatabaseService } from "./database/database.service";

describe("AppController", () => {
  let controller: AppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: DatabaseService,
          useValue: { ping: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
  });

  it("returns API health information", async () => {
    await expect(controller.health()).resolves.toMatchObject({
      success: true,
      data: {
        status: "ok",
        database: "ok",
      },
    });
  });
});
