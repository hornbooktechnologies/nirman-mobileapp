import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { NotificationsRepository } from "./notifications.repository";
import { notificationCopy } from "./notification-copy";

type ExpoTicket = {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
};

@Injectable()
export class NotificationsPushWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsPushWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly repository: NotificationsRepository) {}

  onModuleInit() {
    if (process.env.NOTIFICATIONS_PUSH_ENABLED === "false") return;
    this.timer = setInterval(() => void this.flush(), 15_000);
    this.timer.unref?.();
    void this.flush();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      const deliveries = await this.repository.claimPushDeliveries();
      for (const delivery of deliveries) {
        const localized = notificationCopy(delivery.locale, delivery.type, {
          title: delivery.title,
          body: delivery.message,
        });
        try {
          const response = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              ...(process.env.EXPO_ACCESS_TOKEN
                ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                : {}),
            },
            body: JSON.stringify({
              to: delivery.expoPushToken,
              title: localized.title,
              body: localized.body,
              sound: "default",
              channelId: "important-updates",
              priority: delivery.importance === "URGENT" ? "high" : "default",
              data: {
                notificationId: delivery.notificationId,
                organizationId: delivery.organizationId,
                projectId: delivery.projectId,
                referenceType: delivery.referenceType,
                referenceId: delivery.referenceId,
                deepLink: delivery.deepLink,
              },
            }),
          });
          if (!response.ok)
            throw new Error(`Expo push HTTP ${response.status}`);
          const body = (await response.json()) as { data?: ExpoTicket };
          const ticket = body.data;
          if (!ticket || ticket.status !== "ok") {
            const code = ticket?.details?.error ?? "EXPO_PUSH_REJECTED";
            await this.repository.failPushDelivery(
              delivery.id,
              delivery.deviceId,
              delivery.attemptCount,
              `${code}: ${ticket?.message ?? "Push rejected"}`,
              code === "DeviceNotRegistered",
            );
          } else {
            await this.repository.completePushDelivery(
              delivery.id,
              ticket.id ?? null,
            );
          }
        } catch (error) {
          await this.repository.failPushDelivery(
            delivery.id,
            delivery.deviceId,
            delivery.attemptCount,
            error instanceof Error ? error.message : "Push delivery failed",
            false,
          );
        }
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : error);
    } finally {
      this.running = false;
    }
  }
}
