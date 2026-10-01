import type { Server } from "node:http";
import "reflect-metadata";
import { ForbiddenException, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { AttendanceController } from "../../modules/attendance/attendance.controller";
import { AttendanceService } from "../../modules/attendance/attendance.service";
import { WagesController } from "../../modules/wages/wages.controller";
import { WagesService } from "../../modules/wages/wages.service";
import { KharchiController } from "../../modules/kharchi/kharchi.controller";
import { KharchiService } from "../../modules/kharchi/kharchi.service";
import { MaterialsController } from "../../modules/materials/materials.controller";
import { MaterialsService } from "../../modules/materials/materials.service";
import { ExpensesController } from "../../modules/expenses/expenses.controller";
import { ExpensesService } from "../../modules/expenses/expenses.service";
import { ProgressController } from "../../modules/progress/progress.controller";
import { ProgressService } from "../../modules/progress/progress.service";
import { PdfExportService } from "./pdf-export.service";
import { PDF_EXPORT_ROW_LIMIT, type ExportReport } from "./report";

describe("PDF endpoint contract", () => {
  let app: INestApplication<Server>;
  const org = "00000000-0000-4000-8000-000000000001";
  const project = "00000000-0000-4000-8000-000000000002";
  const batch = "00000000-0000-4000-8000-000000000003";
  const modules = [
    {
      name: "attendance",
      controller: AttendanceController,
      service: AttendanceService,
    },
    { name: "wages", controller: WagesController, service: WagesService },
    { name: "kharchi", controller: KharchiController, service: KharchiService },
    {
      name: "materials",
      controller: MaterialsController,
      service: MaterialsService,
    },
    {
      name: "expenses",
      controller: ExpensesController,
      service: ExpensesService,
    },
    {
      name: "progress",
      controller: ProgressController,
      service: ProgressService,
    },
  ];
  const actor = {
    id: "fixture-user",
    permissions: modules.map((module) => ({
      resource: module.name,
      action: "export",
    })),
  };
  const report: ExportReport = {
    title: "Report",
    projectName: "Green Heights",
    csvFilename: "report.csv",
    pdfFilename: "report.pdf",
    tables: [{ headers: ["Code"], rows: [] }],
  };
  const exports = new Map(
    modules.map((module) => [module.name, jest.fn().mockResolvedValue(report)]),
  );
  const renderer = new PdfExportService();
  const render = jest.spyOn(renderer, "render");

  beforeAll(async () => {
    const context = await Test.createTestingModule({
      controllers: modules.map((module) => module.controller),
      providers: [
        ...modules.map((module) => ({
          provide: module.service,
          useValue: { exportReport: exports.get(module.name) },
        })),
        { provide: PdfExportService, useValue: renderer },
      ],
    }).compile();
    app = context.createNestApplication<INestApplication<Server>>();
    app.setGlobalPrefix("api/v1");
    app.use(
      (
        req: Request & { user?: unknown },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = actor;
        next();
      },
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(modules)(
    "$name returns the API PDF and forwards authorization context and filters",
    async (module) => {
      const suffix =
        module.name === "wages" ? `batches/${batch}/export/pdf` : "export/pdf";
      const query =
        module.name === "attendance"
          ? "?startDate=2026-09-01&endDate=2026-09-30"
          : module.name === "wages"
            ? ""
            : "?search=Site";
      const response = await request(app.getHttpServer())
        .get(
          `/api/v1/organizations/${org}/projects/${project}/${module.name}/${suffix}${query}`,
        )
        .expect(200)
        .expect("Content-Type", /application\/pdf/)
        .expect("Cache-Control", "private, no-store");
      expect(response.headers["content-disposition"]).toBe(
        'attachment; filename="report.pdf"',
      );
      expect(render).toHaveBeenCalledWith(report);
      expect(Buffer.isBuffer(response.body)).toBe(true);
      expect((response.body as Buffer).subarray(0, 5).toString()).toBe("%PDF-");
      expect(Number(response.headers["content-length"])).toBe(
        (response.body as Buffer).length,
      );
      const args = exports.get(module.name)!.mock.calls[0] as unknown[];
      expect(args.slice(0, 2)).toEqual([org, project]);
      expect(args.at(-1)).toBe(PDF_EXPORT_ROW_LIMIT);
      expect(args.at(-2)).toBe(actor);
      if (module.name === "wages") expect(args[2]).toBe(batch);
      else if (module.name === "attendance")
        expect(args.slice(2, 4)).toEqual(["2026-09-01", "2026-09-30"]);
      else expect(args[2]).toMatchObject({ search: "Site" });
      expect(
        Reflect.getMetadata(
          "permissions",
          module.controller.prototype.exportPdf,
        ),
      ).toEqual([`${module.name}:export`]);
    },
  );

  it("does not render or return PDF bytes when project access rejects the export", async () => {
    exports
      .get("materials")!
      .mockRejectedValueOnce(
        new ForbiddenException("Project export permission denied"),
      );
    await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${org}/projects/${project}/materials/export/pdf`,
      )
      .expect(403);
    expect(render).not.toHaveBeenCalled();
  });

  it("rejects invalid project IDs before report queries", async () => {
    await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${org}/projects/not-a-uuid/progress/export/pdf`,
      )
      .expect(400);
    expect(exports.get("progress")).not.toHaveBeenCalled();
  });

  it("enforces the existing export permission before querying a wage batch", async () => {
    const original = actor.permissions;
    actor.permissions = original.filter(
      (permission) => permission.resource !== "wages",
    );
    try {
      await request(app.getHttpServer())
        .get(
          `/api/v1/organizations/${org}/projects/${project}/wages/batches/${batch}/export/pdf`,
        )
        .expect(403);
      expect(exports.get("wages")).not.toHaveBeenCalled();
      expect(render).not.toHaveBeenCalled();
    } finally {
      actor.permissions = original;
    }
  });
});
