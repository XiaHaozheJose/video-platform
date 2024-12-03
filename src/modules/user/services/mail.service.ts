import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EMAIL_TEMPLATES } from '../templates/email-templates';

@Injectable()
export class MailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: true,
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, username: string, token: string) {
    const resetLink = `${this.configService.get('APP_URL')}/reset-password?token=${token}`;
    const template = EMAIL_TEMPLATES.passwordReset;

    try {
      await this.transporter.sendMail({
        from: this.configService.get('MAIL_FROM'),
        to: email,
        subject: template.subject,
        html: template.template({ username, resetLink }),
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('邮件发送失败');
    }
  }

  async sendAlertEmail(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('MAIL_FROM'),
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Failed to send alert email:', error);
      throw new Error('告警邮件发送失败');
    }
  }

  public async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: any[];
  }) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('MAIL_FROM'),
        ...options,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('邮件发送失败');
    }
  }
} 