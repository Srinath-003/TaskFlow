const nodemailer = require("nodemailer");

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true only for port 465
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Verify Error:", error);
  } else {
    console.log("SMTP Ready");
  }
});
/**
 * Send due task reminder email to the user.
 * @param {string} toEmail - Recipient's email address
 * @param {string} userName - Recipient's name
 * @param {Array}  tasks    - Array of due task objects
 */
const sendDueTaskEmail = async (toEmail, userName, tasks) => {
  const taskRows = tasks
    .map((t) => {
      const due = t.dueDate
        ? new Date(t.dueDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "No date";

      return `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;">${t.text}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#64748b;">${t.topic || "General"}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;color:#ef4444;font-weight:600;">${due}</td>
        </tr>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                    ✅ TaskFlow
                  </h1>
                  <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">Due Date Reminder</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${userName}</strong>,</p>
                  <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                    You have <strong>${tasks.length} task${tasks.length > 1 ? "s" : ""}</strong> that 
                    ${tasks.length > 1 ? "are" : "is"} due today or overdue. Please review and complete ${tasks.length > 1 ? "them" : "it"} as soon as possible.
                  </p>

                  <!-- Task table -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                    <thead>
                      <tr style="background:#f8fafc;">
                        <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Task</th>
                        <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Topic</th>
                        <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #e2e8f0;">Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${taskRows}
                    </tbody>
                  </table>

                  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
                    Log in to your TaskFlow to mark tasks complete.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;">
                    This is an automated reminder from <strong>TaskFlow</strong>. Please do not reply to this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,  
    to: toEmail,
    subject: `⏰ Reminder: You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} due`,
    html
  });

  console.log(`[Email] Sent due-task reminder to ${toEmail} (${tasks.length} task${tasks.length > 1 ? "s" : ""})`);
};

const sendInviteEmail = async (toEmail, userName, topicName, inviterName) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
    </head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px 40px;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
                    ✅ TaskFlow
                  </h1>
                  <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">Topic Invitation</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${userName}</strong>,</p>
                  <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                    <strong>${inviterName}</strong> has invited you to collaborate on the topic: <strong style="color:#4f46e5;">${topicName}</strong>.
                  </p>

                  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
                    Log in to your TaskFlow dashboard, go to the <strong>Invitations</strong> section, and accept the invite to get started!
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8fafc;padding:16px 40px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;">
                    This is an automated invitation from <strong>TaskFlow</strong>. Please do not reply to this email.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"TaskFlow" <${process.env.EMAIL_USER}>`,  
    to: toEmail,
    subject: `✉️ Invitation to collaborate on "${topicName}"`,
    html
  });

  console.log(`[Email] Sent invitation email to ${toEmail} for topic "${topicName}"`);
};

module.exports = { sendDueTaskEmail, sendInviteEmail };
