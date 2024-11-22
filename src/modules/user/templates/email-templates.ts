export const EMAIL_TEMPLATES = {
  passwordReset: {
    subject: '密码重置 - 视频平台',
    template: (data: { username: string; resetLink: string }) => `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>密码重置</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50; margin-bottom: 20px;">密码重置</h2>
            <p>尊敬的 ${data.username}：</p>
            <p>我们收到了您的密码重置请求。请点击下面的链接重置您的密码：</p>
            <p style="margin: 20px 0;">
              <a href="${data.resetLink}" 
                 style="background-color: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                重置密码
              </a>
            </p>
            <p>或者复制以下链接到浏览器：</p>
            <p style="background-color: #f8f9fa; padding: 10px; word-break: break-all;">
              ${data.resetLink}
            </p>
            <p>此链接有效期为1小时。如果您没有请求重置密码，请忽略此邮件。</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #7f8c8d; font-size: 12px;">
              此邮件由系统自动发送，请勿回复。
            </p>
          </div>
        </body>
      </html>
    `,
  },
}; 