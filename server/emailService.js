const axios = require("axios");

/**
 * Reusable helper to send email via EmailJS REST API.
 * @param {string} templateId - EmailJS template ID
 * @param {string} toEmail - Recipient email address
 * @param {string} userName - Recipient name
 * @param {string} subject - Email subject
 * @param {string} html - Formatted HTML email template
 */
const sendEmailJSEmail = async (
    templateId,
    params
) => {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    const missing = [];
    if (!serviceId) missing.push("EMAILJS_SERVICE_ID");
    if (!templateId) missing.push("template_id");
    if (!publicKey) missing.push("EMAILJS_PUBLIC_KEY");
    if (!privateKey) missing.push("EMAILJS_PRIVATE_KEY");

    const errMsg = `Missing EmailJS configuration: ${missing.join(", ")}`;
    console.error(errMsg);
    throw new Error(errMsg);
  }

  try {
    const payload = {
  service_id: serviceId,
  template_id: templateId,
  user_id: publicKey,
  accessToken: privateKey,

  template_params: params
};

    const response = await axios.post("https://api.emailjs.com/api/v1.0/email/send", payload, {
      headers: {
        "Content-Type": "application/json"
      }
    });

    return {
      response: response.data || "200 OK",
      messageId: `emailjs-${Date.now()}`
    };
  } catch (error) {
    const errorDetails = error.response && error.response.data
      ? typeof error.response.data === "object"
        ? JSON.stringify(error.response.data)
        : error.response.data
      : error.message;

    console.error(`[EmailJS] Failed to send email to ${toEmail}:`, errorDetails);
    throw new Error(`EmailJS send failure: ${errorDetails}`);
  }
};

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

  const params = {
    to_email: toEmail,
    to_name: userName,
    from_name: "TaskFlow",

    subject: `⏰ Reminder: ${tasks.length} Task${tasks.length > 1 ? "s" : ""}`,

    task_count: tasks.length
};

  const info = await sendEmailJSEmail(
    process.env.EMAILJS_TEMPLATE_REMINDER,
    // toEmail,
    // userName,
    `⏰ Reminder: You have ${tasks.length} task${tasks.length > 1 ? "s" : ""} due`,
    html
  );

  console.log(`[Email] Sent due-task reminder to ${toEmail} (${tasks.length} task${tasks.length > 1 ? "s" : ""})`);
  return info;
};

/**
 * Send collaboration invitation email to the user.
 * @param {string} toEmail - Recipient's email address
 * @param {string} userName - Recipient's name
 * @param {string} topicName - Topic name to collaborate on
 * @param {string} inviterName - Inviter's name
 */
const sendInviteEmail = async (toEmail, userName, topicName, inviterName) => {
  const params = {
    to_email: toEmail,
    to_name: userName,
    from_name: "TaskFlow",

    subject: `✉️ Invitation to collaborate on "${topicName}"`,

    inviter: inviterName,
    topic: topicName
};

await sendEmailJSEmail(
    process.env.EMAILJS_TEMPLATE_INVITE,
    params
);
  const info = await sendEmailJSEmail(
    process.env.EMAILJS_TEMPLATE_INVITE,
    toEmail,
    userName,
    `✉️ Invitation to collaborate on "${topicName}"`,
    html
  );

  console.log(`[Email] Sent invitation email to ${toEmail} for topic "${topicName}"`);
  return info;
};

/**
 * Send individual task reminder email to the user.
 * @param {string} toEmail - Recipient's email address
 * @param {string} userName - Recipient's name
 * @param {string} taskText - Task text
 * @param {string} remindTime - Formatted reminder time
 */
const sendReminderEmail = async (toEmail, userName, taskText, remindTime) => {
  const params = {
    to_email: toEmail,
    to_name: userName,
    from_name: "TaskFlow",

    subject: "🔔 Task Reminder",

    task: taskText,
    remind_time: remindTime
};

await sendEmailJSEmail(
    process.env.EMAILJS_TEMPLATE_REMINDER,
    params
);

  console.log("Sending email to:", toEmail);
  const info = await sendEmailJSEmail(
    process.env.EMAILJS_TEMPLATE_REMINDER,
    toEmail,
    userName,
    `🔔 Task Reminder`,
    html
  );

  console.log("Email sent:", info.response);
  return info;
};

module.exports = { sendDueTaskEmail, sendInviteEmail, sendReminderEmail };
