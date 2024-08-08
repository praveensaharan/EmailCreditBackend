const sql = require("./db");
const axios = require("axios");

async function getTransactions(clerkUserId) {
  try {
    const userQuery = await sql`
      SELECT * FROM transactions 
      WHERE user_id = ${clerkUserId};
    `;

    return userQuery;
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function MakeTransactions(
  clerkUserId,
  credit,
  description,
  status,
  notes
) {
  try {
    const userQuery = await sql`
      INSERT INTO transactions (user_id, amount, description, status, notes)
      VALUES (${clerkUserId}, ${credit}, ${description}, ${status}, ${notes});
    `;

    return userQuery;
  } catch (error) {
    console.error("Error making transaction:", error.message); // Updated error message
    throw new Error("Internal Server Error");
  }
}

async function getInsights() {
  try {
    const companies = await sql`SELECT * FROM company_compl;`;
    const totalCompanies = companies.length;

    const transactionResult =
      await sql`SELECT COUNT(*) as totalTransactions FROM transactions;`;
    const totalTransactions = parseInt(transactionResult[0].totaltransactions);

    const redemptionResult =
      await sql`SELECT COUNT(*) as totalRedemptions FROM redemptions;`;
    const totalRedemptions = parseInt(redemptionResult[0].totalredemptions);

    let totalEmails = 0;
    companies.forEach((company) => {
      const emails = [
        company.email1,
        company.email2,
        company.email3,
        company.email4,
        company.email5,
        company.email6,
      ].filter((email) => email);
      totalEmails += emails.length;
    });

    // Fetch daily verification counts for the last 30 days
    const dailyVerificationCounts = await sql`
      SELECT 
        DATE(lastverificationdate) AS date,
        COUNT(*) AS emailCount
      FROM company_compl
      WHERE lastverificationdate >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(lastverificationdate)
      ORDER BY DATE(lastverificationdate) DESC;
    `;

    // Convert dailyVerificationCounts to JSONB format
    const dailyVerificationCountsJson = JSON.stringify(dailyVerificationCounts);

    // Insert the insights into the insights table
    await sql`
      INSERT INTO insights (total_companies, total_emails, total_transactions, total_redemptions, daily_verification_counts)
      VALUES (${totalCompanies}, ${totalEmails}, ${totalTransactions}, ${totalRedemptions}, ${dailyVerificationCountsJson});
    `;

    return {
      totalCompanies,
      totalEmails,
      dailyVerificationCounts,
      totalTransactions,
      totalRedemptions,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function main() {
  try {
    const result = await getInsights();
    console.log("Final result:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();

// async function main() {
//   try {
//     // const result1 = await MakeTransactions(
//     //   "user_2issiUUcFXXMO569jyWpL6shrX1",
//     //   -1,
//     //   "Clerk Emails",
//     //   "Completed",
//     //   "Service charge for unlocking emails"
//     // );
//     const result = await getInsights();
//     // const result = await redeemCoupon(
//     //   `user_2issiUUcFXXMO569jyWpL6shrX1`,
//     //   "SAVE10"
//     // );
//     console.log("Final result:", result);
//   } catch (error) {
//     console.error("Error:", error.message); // Improved error handling
//   }
// }
