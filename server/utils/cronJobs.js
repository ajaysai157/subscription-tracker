const cron = require('node-cron');
const nodemailer = require('nodemailer');
const prisma = require('../db');

let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log('Using configured SMTP settings for email alerts.');
  } else {
    // Generate test SMTP service account from ethereal.email
    console.log('No SMTP credentials found in .env. Generating Ethereal Email test account...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log('--------------------------------------------------');
      console.log('Ethereal Email sandbox configured.');
      console.log(`User: ${testAccount.user}`);
      console.log('--------------------------------------------------');
    } catch (err) {
      console.error('Failed to create Ethereal Email test account:', err);
    }
  }
  return transporter;
}

// core reminder logic
async function checkAndSendReminders() {
  console.log('Running subscription renewal check...');
  try {
    const today = new Date();
    
    // We want subscriptions renewing in exactly 2 days
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + 2);
    
    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999));

    console.log(`Checking for subscriptions renewing between ${startOfDay.toISOString()} and ${endOfDay.toISOString()}`);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        nextRenewalDate: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      include: {
        user: true
      }
    });

    console.log(`Found ${subscriptions.length} subscriptions renewing in 2 days.`);

    const mailTransporter = await getTransporter();
    if (!mailTransporter) {
      console.error('Email transporter not initialized. Skipping reminders.');
      return { success: false, message: 'Transporter not initialized' };
    }

    const sentEmails = [];

    for (const sub of subscriptions) {
      const emailContent = `
        <h1>Subscription Renewal Alert</h1>
        <p>Hello,</p>
        <p>This is a reminder that your subscription for <strong>${sub.name}</strong> is renewing in 2 days.</p>
        <ul>
          <li><strong>Price:</strong> $${sub.price.toFixed(2)}</li>
          <li><strong>Billing Cycle:</strong> ${sub.billingCycle}</li>
          <li><strong>Category:</strong> ${sub.category}</li>
          <li><strong>Renewal Date:</strong> ${sub.nextRenewalDate.toDateString()}</li>
        </ul>
        <p>Thank you for using SubScribe!</p>
      `;

      const mailOptions = {
        from: process.env.SMTP_USER || '"SubScribe Tracker" <no-reply@subscribe.com>',
        to: sub.user.email,
        subject: `Renewal Alert: ${sub.name} in 2 days!`,
        html: emailContent
      };

      try {
        const info = await mailTransporter.sendMail(mailOptions);
        console.log(`Email sent successfully for subscription "${sub.name}" to ${sub.user.email}`);
        
        // If using Ethereal, log the preview URL
        if (!process.env.SMTP_USER) {
          const previewUrl = nodemailer.getTestMessageUrl(info);
          console.log(`Preview URL: ${previewUrl}`);
          sentEmails.push({ subName: sub.name, to: sub.user.email, previewUrl });
        } else {
          sentEmails.push({ subName: sub.name, to: sub.user.email });
        }
      } catch (err) {
        console.error(`Error sending email to ${sub.user.email} for subscription "${sub.name}":`, err);
      }
    }

    return { success: true, count: subscriptions.length, sentEmails };
  } catch (error) {
    console.error('Error during renewal check:', error);
    return { success: false, error: error.message };
  }
}

// Schedule the cron job to run daily at 08:00 AM (local time)
const startCronJob = () => {
  cron.schedule('0 8 * * *', async () => {
    await checkAndSendReminders();
  });
  console.log('Reminder cron job scheduled for 08:00 AM daily.');
};

module.exports = {
  startCronJob,
  checkAndSendReminders
};
