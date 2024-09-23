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

    // console.log(
    //   "dailyVerificationCounts",
    //   dailyVerificationCounts[0].emailcount
    // );
    // dailyVerificationCounts[0].emailcount = "37";
    // console.log(
    //   "dailyVerificationCounts",
    //   dailyVerificationCounts[0].emailcount
    // );
    const dailyVerificationCountsJson = JSON.stringify(dailyVerificationCounts);

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

async function insertOrUpdateCompanyContacts2(
  companyName,
  emails,
  companyDomain
) {
  try {
    if (!companyName || !companyDomain || !Array.isArray(emails)) {
      throw new Error("Invalid input data");
    }

    const uniqueEmails = [
      ...new Set(
        emails.filter((email) => typeof email === "string" && email.trim())
      ),
    ];

    const existingEntries = await sql`
      SELECT * FROM company_compl
      WHERE company_name = ${companyName}
      AND company_domain = ${companyDomain}
    `;

    if (existingEntries.length > 0) {
      let updatedEmails = new Set();

      existingEntries.forEach((entry) => {
        for (let i = 1; i <= 6; i++) {
          if (entry[`email${i}`]) {
            updatedEmails.add(entry[`email${i}`]);
          }
        }
      });

      uniqueEmails.forEach((email) => {
        updatedEmails.add(email);
      });
      const emailArray = Array.from(updatedEmails).slice(0, 6);
      const firstEntryId = existingEntries[0].id;
      const numEmails = emailArray.length;
      await sql`
        UPDATE company_compl
      SET
        email1 = ${numEmails >= 1 ? emailArray[0] : null},
        email2 = ${numEmails >= 2 ? emailArray[1] : null},
        email3 = ${numEmails >= 3 ? emailArray[2] : null},
        email4 = ${numEmails >= 4 ? emailArray[3] : null},
        email5 = ${numEmails >= 5 ? emailArray[4] : null},
        email6 = ${numEmails >= 6 ? emailArray[5] : null},
        verify = true
      WHERE id = ${firstEntryId}
      `;

      console.log("Successfully updated company contacts with new emails.");
    } else {
      const emailValues = uniqueEmails
        .slice(0, 6)
        .concat(Array(6).fill(null))
        .slice(0, 6);

      await sql`
        INSERT INTO company_compl (
          company_name,
          email1, email2, email3, email4, email5, email6,
          verify,
          company_domain
        ) VALUES (
          ${companyName},
          ${emailValues[0]}, ${emailValues[1]}, ${emailValues[2]},
          ${emailValues[3]}, ${emailValues[4]}, ${emailValues[5]},
          true,
          ${companyDomain}
        )
      `;

      console.log("Successfully inserted new company contacts.");
    }
  } catch (err) {
    console.error("Error inserting or updating company contacts:", err.message);
    throw err;
  }
}

async function getAllCompensation() {
  try {
    const companies = await sql`SELECT * FROM all_compensation limit 50;`;

    return {
      companies,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function getLeetcodeCompensation() {
  try {
    const companies = await sql`SELECT * FROM leetcodetable limit 50;`;

    return {
      companies,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function getIITcodeCompensation() {
  try {
    const companies = await sql`SELECT * FROM iit_compensation limit 50;`;

    return {
      companies,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function main() {
  try {
    const result = await getLeetcodeCompensation();
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
