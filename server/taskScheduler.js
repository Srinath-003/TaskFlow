const cron = require("node-cron");
const Task = require("./models/Task");
const User = require("./models/User");
const { sendReminderEmail } = require("./emailService");

let isRunning = false;

const checkAndNotifyReminders = async () => {
  if (isRunning) {
    console.log("[Scheduler] Reminder check already in progress, skipping this run.");
    return;
  }

  isRunning = true;
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
      for (let i = 0; i < task.reminders.length; i++) {
        const reminder = task.reminders[i];

        if (reminder.active && reminder.remindAt <= now && !reminder.notificationSent) {
          try {
            // Atomically claim this reminder using findOneAndUpdate so no other server instance can process it
            const claimedTask = await Task.findOneAndUpdate(
              {
                _id: task._id,
                reminders: {
                  $elemMatch: {
                    userId: reminder.userId,
                    notificationSent: false,
                    active: true
                  }
                }
              },
              {
                $set: {
                  "reminders.$.notificationSent": true
                }
              },
              { new: true }
            );

            if (!claimedTask) {
              console.log(`[Scheduler] Reminder for task ${task._id} already claimed by another server instance, skipping.`);
              continue;
            }

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

            // Handle repeat and update database directly
            if (reminder.repeat === "daily") {
              const nextDate = new Date(reminder.remindAt);
              nextDate.setDate(nextDate.getDate() + 1);
              await Task.updateOne(
                { _id: task._id, "reminders.userId": reminder.userId },
                {
                  $set: {
                    "reminders.$.remindAt": nextDate,
                    "reminders.$.notificationSent": false
                  }
                }
              );
            } else if (reminder.repeat === "weekly") {
              const nextDate = new Date(reminder.remindAt);
              nextDate.setDate(nextDate.getDate() + 7);
              await Task.updateOne(
                { _id: task._id, "reminders.userId": reminder.userId },
                {
                  $set: {
                    "reminders.$.remindAt": nextDate,
                    "reminders.$.notificationSent": false
                  }
                }
              );
            } else {
              // "once": mark as inactive
              await Task.updateOne(
                { _id: task._id, "reminders.userId": reminder.userId },
                {
                  $set: {
                    "reminders.$.active": false,
                    "reminders.$.notificationSent": true
                  }
                }
              );
            }
          } catch (err) {
            console.error(`[Scheduler] Failed to process reminder for task ${task._id}, user ${reminder.userId}:`, err.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error checking reminders:", err.message);
  } finally {
    isRunning = false;
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
