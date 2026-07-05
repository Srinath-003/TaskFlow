const cron = require("node-cron");
const Task = require("./models/Task");
const User = require("./models/User");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendIndividualReminderEmail = async (toEmail, userName, taskText, remindTime) => {
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
                    🔔 Task Reminder
                  </h1>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="margin:0 0 8px;color:#1e293b;font-size:16px;">Hi <strong>${userName}</strong>,</p>
                  <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                    Here is a reminder for your task:
                  </p>
                  <div style="background:#f8fafc;padding:16px;border-left:4px solid #4f46e5;border-radius:4px;font-size:16px;color:#1e293b;margin-bottom:24px;">
                    <strong>${taskText}</strong>
                  </div>
                  <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;">
                    This reminder was set for: ${remindTime}
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
    subject: `🔔 Task Reminder: "${taskText.length > 30 ? taskText.slice(0, 30) + "..." : taskText}"`,
    html
  });
};

const checkAndNotifyReminders = async () => {
  console.log("[Scheduler] Checking for active reminders...");
  try {
    const now = new Date();

    // Find tasks that have at least one active, unsent reminder where remindAt <= now
    const tasksWithReminders = await Task.find({
      "reminders.active": true,
      "reminders.remindAt": { $lte: now },
      "reminders.notificationSent": false
    });

    if (tasksWithReminders.length === 0) {
      return;
    }

    for (const task of tasksWithReminders) {
      let taskUpdated = false;

      for (let i = 0; i < task.reminders.length; i++) {
        const reminder = task.reminders[i];
        
        if (reminder.active && reminder.remindAt <= now && !reminder.notificationSent) {
          try {
            // Find the user to notify
            const user = await User.findById(reminder.userId);
            if (user && user.email) {
              const formattedTime = new Date(reminder.remindAt).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short"
              });
              
              await sendIndividualReminderEmail(user.email, user.name || user.email, task.text, formattedTime);
              console.log(`[Scheduler] Reminder email sent to ${user.email} for task: "${task.text}"`);
            } else {
              console.warn(`[Scheduler] User not found or has no email: ${reminder.userId}`);
            }

            // Handle repeat
            if (reminder.repeat === "daily") {
              const nextDate = new Date(reminder.remindAt);
              nextDate.setDate(nextDate.getDate() + 1);
              reminder.remindAt = nextDate;
              reminder.notificationSent = false;
            } else if (reminder.repeat === "weekly") {
              const nextDate = new Date(reminder.remindAt);
              nextDate.setDate(nextDate.getDate() + 7);
              reminder.remindAt = nextDate;
              reminder.notificationSent = false;
            } else {
              // "once": mark as inactive
              reminder.active = false;
              reminder.notificationSent = true;
            }
            taskUpdated = true;
          } catch (err) {
            console.error(`[Scheduler] Failed to process reminder for task ${task._id}, user ${reminder.userId}:`, err.message);
          }
        }
      }

      if (taskUpdated) {
        await task.save();
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error checking reminders:", err.message);
  }
};

const startScheduler = () => {
  // Check immediately
  checkAndNotifyReminders();

  // Run every minute to check for precise time reminders
  cron.schedule("* * * * *", checkAndNotifyReminders);
  console.log("[Scheduler] Task reminder scheduler started (runs every minute).");
};

module.exports = { startScheduler };
