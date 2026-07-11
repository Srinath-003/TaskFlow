const cron = require("node-cron");
const Task = require("./models/Task");
const User = require("./models/User");
const { sendReminderEmail } = require("./emailService");

const checkAndNotifyReminders = async () => {
  console.log("[Scheduler] Checking for active reminders...");
  try {
    const now = new Date();

    // Find tasks that have at least one active, unsent reminder where remindAt <= now
    const tasksWithReminders = await Task.find({
      reminders: {
        $elemMatch: {
          active: true,
          remindAt: { $lte: now },
          notificationSent: false
        }
      }
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

              await sendReminderEmail(
                user.email,
                user.name || user.email,
                task.text,
                formattedTime
              );
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
