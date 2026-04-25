import { Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import nodemailer, { type Transporter } from "nodemailer";

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.config.get<string>("app.smtp.host") ?? "";
    const port = this.config.get<number>("app.smtp.port") ?? 587;
    const secure = this.config.get<boolean>("app.smtp.secure") ?? false;
    const user = this.config.get<string>("app.smtp.user") ?? "";
    const pass = this.config.get<string>("app.smtp.pass") ?? "";

    if (!host || !user || !pass) {
      throw new InternalServerErrorException(
        "Email delivery is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASS."
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
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

  async sendMail(input: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) {
    const transporter = this.getTransporter();

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text
    });

    this.logger.log(`Delivered email "${input.subject}" to ${input.to}`);
  }
}
