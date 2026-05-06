import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;
  private startupVerificationStarted = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const nodeEnv = this.config.get<string>("app.nodeEnv") ?? "development";
    const verifyOnStartup =
      this.config.get<boolean>("app.smtp.verifyOnStartup") ?? nodeEnv === "production";

    if (!verifyOnStartup || this.startupVerificationStarted) {
      return;
    }

    this.startupVerificationStarted = true;

    try {
      await this.verifyTransport("startup");
    } catch (error) {
      this.logger.error(this.buildSmtpErrorMessage(error, "startup verification"));
    }
  }

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>("app.smtp.host") ?? "";
    const port = this.config.get<number>("app.smtp.port") ?? 587;
    const secure = this.config.get<boolean>("app.smtp.secure") ?? false;
    const user = this.config.get<string>("app.smtp.user") ?? "";
    const pass = this.config.get<string>("app.smtp.pass") ?? "";
    const connectionTimeout = this.config.get<number>("app.smtp.connectionTimeoutMs") ?? 15000;
    const greetingTimeout = this.config.get<number>("app.smtp.greetingTimeoutMs") ?? 15000;
    const socketTimeout = this.config.get<number>("app.smtp.socketTimeoutMs") ?? 20000;

    if (!host || !user || !pass) {
      throw new InternalServerErrorException(
        "Email delivery is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS."
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
      auth: {
        user,
        pass
      }
    });

    return this.transporter;
  }

  private getFromAddress() {
    const fromEmail = this.config.get<string>("app.smtp.fromEmail") ?? "";
    const fromName = this.config.get<string>("app.smtp.fromName") ?? "ATHAR LMS";

    if (!fromEmail) {
      throw new InternalServerErrorException(
        "Email sender is not configured. Please set SMTP_FROM_EMAIL."
      );
    }

    return `"${fromName.replace(/"/g, "")}" <${fromEmail}>`;
  }

  private buildSmtpErrorMessage(error: unknown, action: string) {
    const host = this.config.get<string>("app.smtp.host") ?? "";
    const port = this.config.get<number>("app.smtp.port") ?? 0;
    const secure = this.config.get<boolean>("app.smtp.secure") ?? false;

    const details =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : typeof error === "string"
          ? error
          : "Unknown SMTP error";

    let classification = "unknown failure";

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const code = "code" in error && typeof error.code === "string" ? error.code : "";

      if (
        message.includes("timeout") ||
        code === "ETIMEDOUT" ||
        code === "ESOCKET" ||
        code === "ECONNECTION"
      ) {
        classification = "network/connectivity timeout";
      } else if (
        message.includes("self signed") ||
        message.includes("certificate") ||
        message.includes("tls") ||
        message.includes("ssl")
      ) {
        classification = "TLS/SSL failure";
      } else if (
        message.includes("auth") ||
        message.includes("invalid login") ||
        code === "EAUTH"
      ) {
        classification = "authentication failure";
      } else if (
        message.includes("sender") ||
        message.includes("from address") ||
        message.includes("mail from")
      ) {
        classification = "sender rejection";
      }
    }

    return `SMTP ${action} failed for ${host}:${port} (secure=${String(secure)}). Classification: ${classification}. Details: ${details}`;
  }

  private async verifyTransport(context: string) {
    const transporter = this.getTransporter();

    try {
      await transporter.verify();
      this.logger.log(`SMTP ${context} verification succeeded.`);
    } catch (error) {
      throw new Error(this.buildSmtpErrorMessage(error, `${context} verification`));
    }
  }

  async sendMail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from: this.getFromAddress(),
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text
      });

      this.logger.log(`Delivered email "${input.subject}" to ${input.to}`);
    } catch (error) {
      this.logger.error(this.buildSmtpErrorMessage(error, `delivery to ${input.to}`));
      throw new InternalServerErrorException(
        "Email delivery failed. Please try again later."
      );
    }
  }
}
