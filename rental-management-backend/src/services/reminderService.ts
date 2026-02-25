import cron from "node-cron";
import { Op } from "sequelize";
import { Billing, Rental, Customer, User } from "../models";
import logger from "../utils/logger";
import { sendEmail } from "./emailService";

/**
 * Starts automated scheduler daemon configured via standard Cron syntax.
 * In production, it runs precisely at minute 0, hour 8, every day (0 8 * * *).
 */
export const startReminderJob = () => {
  cron.schedule("0 8 * * *", async () => {
    logger.info("Running daily reminder checks for due bills...");
    try {
      // Find billings that remain unpaid and whose deadline falls exactly inside the next 3 days threshold.
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 3);

      const dueDataString = targetDate.toISOString().split("T")[0];

      // Any bills pending under our isolated criteria block
      const upcomingBills: any[] = await Billing.findAll({
        where: {
          status: "pending",
          dueDate: {
            [Op.lte]: dueDataString,
          },
        },
        include: [
          {
            model: Rental,
            include: [Customer],
          },
        ],
      });

      // Fetch all internal app users to alert them instead of the customer
      const appUsers = await User.findAll();

      // Output mock notifications out to specific linked targets conceptually.
      for (const bill of upcomingBills) {
        if (bill.Rental && bill.Rental.Customer) {
          const customer = bill.Rental.Customer;

          for (const user of appUsers) {
            const subject = `Upcoming Bill Reminder: ${customer.firstName} ${customer.lastName}`;
            const text = `Attention: Customer ${customer.firstName} ${customer.lastName} (${customer.email}) has a pending bill of ₹${bill.amount} due on ${bill.dueDate}.`;
            const html = `
              <h2>Upcoming Bill Reminder</h2>
              <p><strong>Customer:</strong> ${customer.firstName} ${customer.lastName} (${customer.email})</p>
              <p><strong>Amount Due:</strong> ₹${bill.amount}</p>
              <p><strong>Due Date:</strong> ${bill.dueDate}</p>
              <p>Please ensure the payment is collected before the deadline.</p>
            `;

            logger.warn(
              `[ALERT] Sending real-time notification to App User -> ${user.email} | Attention: Customer ${customer.firstName} ${customer.lastName} (${customer.email}) has a pending bill of ₹${bill.amount} due on ${bill.dueDate}`,
            );
            
            sendEmail(user.email, subject, text, html).catch(err => {
              logger.error(`Failed to send reminder email to ${user.email}:`, err);
            });
          }
        }
      }

      // Automatically convert stale entries towards `overdue` parameter logic flag
      const todayString = new Date().toISOString().split("T")[0];
      const overdueBills = await Billing.findAll({
        where: {
          status: "pending",
          dueDate: {
            [Op.lt]: todayString,
          },
        },
      });

      // Modify database rows universally to signal they missed deadline logic criteria.
      for (const bill of overdueBills) {
        await (bill as any).update({ status: "overdue" });
        logger.info(`[OVERDUE] Bill ID ${(bill as any).id} marked as overdue.`);
      }
    } catch (error) {
      logger.error("Error running reminder job:", error);
    }
  });
  logger.info("Reminder cron job scheduled.");
};
