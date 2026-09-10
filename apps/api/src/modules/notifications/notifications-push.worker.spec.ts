import { NotificationsPushWorker } from "./notifications-push.worker";
import type {
  NotificationsRepository,
  PendingPushDelivery,
} from "./notifications.repository";

describe("NotificationsPushWorker", () => {
  const delivery = {
    id: "delivery",
    notificationId: "notification",
    deviceId: "device",
    expoPushToken: "ExponentPushToken[token]",
    locale: "gu",
    type: "EXPENSE_APPROVAL_REQUIRED",
    title: "Fallback",
    message: "Fallback",
    deepLink: "/(app)/expenses",
    organizationId: "organization",
    projectId: "project",
    referenceType: "site_expense",
    referenceId: "expense",
    importance: "HIGH",
    attemptCount: 0,
  } as PendingPushDelivery;
  const repository = {
    claimPushDeliveries: jest.fn(),
    completePushDelivery: jest.fn(),
    failPushDelivery: jest.fn(),
  } as unknown as jest.Mocked<NotificationsRepository>;
  const worker = new NotificationsPushWorker(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.claimPushDeliveries.mockResolvedValue([delivery]);
  });
  afterEach(() => jest.restoreAllMocks());

  it("sends localized push copy and records the provider ticket", async () => {
    const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { status: "ok", id: "ticket" } }),
    } as Response);
    await worker.flush();
    const rawBody = (fetchMock.mock.calls[0]?.[1] as RequestInit).body;
    expect(typeof rawBody).toBe("string");
    const body = JSON.parse(rawBody as string) as {
      title: string;
      data: { notificationId: string };
    };
    expect(body.title).toBe("ખર્ચ મંજૂરી જરૂરી");
    expect(body.data.notificationId).toBe("notification");
    expect(repository.completePushDelivery.mock.calls[0]).toEqual([
      "delivery",
      "ticket",
    ]);
  });

  it("disables a permanently unregistered device", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            status: "error",
            message: "gone",
            details: { error: "DeviceNotRegistered" },
          },
        }),
    } as Response);
    await worker.flush();
    expect(repository.failPushDelivery.mock.calls[0]).toEqual([
      "delivery",
      "device",
      0,
      "DeviceNotRegistered: gone",
      true,
    ]);
  });
});
