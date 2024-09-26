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

async function getCompensationStats(xyz) {
  try {
    let companies;
    if (xyz === "all") {
      companies = await sql`SELECT * FROM all_compensation;`;
    } else if (xyz === "iit") {
      companies = await sql`SELECT * FROM iit_compensation;`;
    } else {
      companies = await sql`SELECT * FROM leetcodetable;`;
    }

    const experienceGroups = {
      entry: [],
      mid: [],
      senior: [],
      seniorPlus: [],
    };

    const salaryRanges = {
      "1-10": 0,
      "10-20": 0,
      "20-30": 0,
      "30-40": 0,
      "40-60": 0,
      "60-80": 0,
      "80-1cr": 0,
      "1cr+": 0,
    };

    const companyOffers = {};

    function calculateMedian(arr) {
      const sorted = arr.sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    companies.forEach((comp) => {
      const experience = comp.experience;

      const totalSalary = parseInt(comp.total_salary, 10) / 100000; // Convert to lakhs

      // Categorize by experience
      if (experience >= 0 && experience <= 1) {
        experienceGroups.entry.push(totalSalary);
      } else if (experience >= 2 && experience <= 6) {
        experienceGroups.mid.push(totalSalary);
      } else if (experience >= 7 && experience <= 10) {
        experienceGroups.senior.push(totalSalary);
      } else {
        experienceGroups.seniorPlus.push(totalSalary);
      }

      if (totalSalary <= 10) {
        salaryRanges["1-10"]++;
      } else if (totalSalary <= 20) {
        salaryRanges["10-20"]++;
      } else if (totalSalary <= 30) {
        salaryRanges["20-30"]++;
      } else if (totalSalary <= 40) {
        salaryRanges["30-40"]++;
      } else if (totalSalary <= 60) {
        salaryRanges["40-60"]++;
      } else if (totalSalary <= 80) {
        salaryRanges["60-80"]++;
      } else if (totalSalary <= 100) {
        salaryRanges["80-1cr"]++;
      } else {
        salaryRanges["1cr+"]++;
      }

      // Count offers by company
      if (companyOffers[comp.company]) {
        companyOffers[comp.company]++;
      } else {
        companyOffers[comp.company] = 1;
      }
    });

    // Function to calculate min, max, and median for each experience group
    function calculateStats(group) {
      if (group.length === 0) return { min: 0, max: 0, median: 0 };
      return {
        min: Math.min(...group),
        max: Math.max(...group),
        median: calculateMedian(group),
      };
    }

    // Prepare the stats for experience groups
    const experienceStats = {
      entry: calculateStats(experienceGroups.entry),
      mid: calculateStats(experienceGroups.mid),
      senior: calculateStats(experienceGroups.senior),
      seniorPlus: calculateStats(experienceGroups.seniorPlus),
    };

    // Sort the companyOffers object by number of offers and get the top 15 companies
    const top15Companies = Object.entries(companyOffers)
      .sort(([, a], [, b]) => b - a) // Sort by number of offers in descending order
      .slice(0, 15) // Get the top 15 companies
      .reduce((acc, [company, offers]) => {
        acc[company] = offers;
        return acc;
      }, {});

    // Return the final stats
    return {
      experienceStats,
      salaryRanges,
      top15Companies, // Return only the top 15 companies
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function getAllCompensation(searchTerm = "") {
  try {
    // Trim the search term and prepare the SQL query
    const trimmedSearchTerm = searchTerm.trim();

    // Fetch data from the database, including a search filter if a term is provided
    const companies = await sql`
      SELECT * FROM all_compensation
      WHERE ${
        trimmedSearchTerm === ""
          ? sql`TRUE`
          : sql`company ILIKE '%' || ${trimmedSearchTerm} || '%'`
      }
      LIMIT 50;`;

    return {
      companies,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function getLeetcodeCompensation(searchTerm = "") {
  try {
    // Trim the search term and prepare the SQL query
    const trimmedSearchTerm = searchTerm.trim();

    // Fetch data from the database, including a search filter if a term is provided
    const companies = await sql`
      SELECT * FROM leetcodetable
      WHERE ${
        trimmedSearchTerm === ""
          ? sql`TRUE`
          : sql`company ILIKE '%' || ${trimmedSearchTerm} || '%'`
      }
      LIMIT 50;`;

    return {
      companies,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
  }
}

async function getIITcodeCompensation(searchTerm = "") {
  try {
    // Trim the search term and prepare the SQL query
    const trimmedSearchTerm = searchTerm.trim();

    // Fetch data from the database, including a search filter if a term is provided
    const companies = await sql`
      SELECT * FROM iit_compensation
      WHERE ${
        trimmedSearchTerm === ""
          ? sql`TRUE`
          : sql`company ILIKE '%' || ${trimmedSearchTerm} || '%'`
      }
      LIMIT 5;`;

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
    const result = await getAllCompensation();
    console.log("Final result:", result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
