// utils.js
const sql = require("./db");
const axios = require("axios");
const { EMAIL_VERIFY } = require("./envSetup");

async function getPgVersion() {
  try {
    const result = await sql`SELECT version()`;
    return result;
  } catch (err) {
    throw new Error(`Error fetching PostgreSQL version: ${err.message}`);
  }
}

async function findCompanyByPattern(pattern) {
  try {
    const sqlPattern = `%${pattern}%`;
    const companyDetails = await sql`
      SELECT * FROM company_compl
      WHERE company_name ILIKE ${sqlPattern}
      OR company_domain ILIKE ${sqlPattern}`;

    const transformedContents = companyDetails.map((company) => {
      return {
        id: company.id,
        companyName: company.company_name,
        companyDomain: company.company_domain,
        emails: ["user1@demomail.com"],
        creationDate: company.creationdate,
        lastVerificationDate: company.lastverificationdate,
      };
    });

    return transformedContents;
  } catch (err) {
    throw new Error(
      `Error fetching details for pattern "${pattern}": ${err.message}`
    );
  }
}

async function printTableContents() {
  try {
    const tableContents =
      await sql`SELECT * FROM company_compl ORDER BY lastverificationdate DESC LIMIT 50`;

    // Transforming the data
    const transformedContents = tableContents.map((company) => {
      // const emails = [
      //   company.email1,
      //   company.email2,
      //   company.email3,
      //   company.email4,
      //   company.email5,
      //   company.email6,
      // ].filter((email) => email);

      return {
        id: company.id,
        companyName: company.company_name,
        companyDomain: company.company_domain,
        emails: ["user1@demomail.com"],
        creationDate: company.creationdate,
        lastVerificationDate: company.lastverificationdate,
      };
    });

    return transformedContents;
  } catch (err) {
    throw new Error(`Error fetching table contents: ${err.message}`);
  }
}

async function findCompaniesByIds(ids) {
  try {
    const companyDetails = await sql`
      SELECT * FROM company_compl 
      WHERE id = ANY(${ids})`;

    const transformedContents = companyDetails.map((company) => {
      const emails = [
        company.email1,
        company.email2,
        company.email3,
        company.email4,
        company.email5,
        company.email6,
      ].filter((email) => email);

      return {
        id: company.id,
        companyName: company.company_name,
        companyDomain: company.company_domain,
        emails: emails,
        creationDate: company.creationdate,
        lastVerificationDate: company.lastverificationdate,
      };
    });

    return transformedContents;
  } catch (err) {
    throw new Error(`Error fetching details for IDs ${ids}: ${err.message}`);
  }
}

async function verifyEmail(email) {
  try {
    const response = await axios.get("https://api.skrapp.io/v3/verify", {
      params: { email },
      headers: {
        "X-Access-Key": EMAIL_VERIFY,
        "Content-Type": "application/json",
      },
    });

    if (response.data.email_status === "invalid") {
      return { email, status: 0 };
    } else {
      return { email, status: 1 };
    }
  } catch (error) {
    console.error(`Error verifying email ${email}: ${error.message}`);
    return { email, status: "verification_failed" };
  }
}

async function verifyCompanyEmails(id, clerkUserId) {
  try {
    // Fetch the company info
    const result = await sql`
      SELECT * FROM company_compl
      WHERE id = ${id};
    `;

    if (result.length === 0) {
      throw new Error(`No company found with ID ${id}`);
    }

    const company = result[0];
    const emails = [
      company.email1,
      company.email2,
      company.email3,
      company.email4,
      company.email5,
      company.email6,
    ].filter((email) => email);

    console.log("Emails to verify:", emails);

    const verificationResults = [];

    for (const email of emails) {
      const verificationResult = await verifyEmail(email);
      if (verificationResult.status === 1) {
        verificationResults.push(verificationResult.email);
      }
    }

    console.log("Verified emails:", verificationResults);

    if (verificationResults.length === 0) {
      await sql`
        DELETE FROM company_compl 
        WHERE id = ${id};
      `;
      console.log(
        `Company with ID ${id} deleted because all emails are invalid.`
      );

      await UpdateBalance(clerkUserId, emails.length); // Subtract credits
      await MakeTransactions(
        clerkUserId,
        -emails.length,
        `${company.company_name} : Emails verification`,
        "Completed",
        "Email verification service fee"
      );

      return null;
    } else {
      // Update the company record with verified emails
      await sql`
        UPDATE company_compl
        SET 
          email1 = ${verificationResults[0] || null},
          email2 = ${verificationResults[1] || null},
          email3 = ${verificationResults[2] || null},
          email4 = ${verificationResults[3] || null},
          email5 = ${verificationResults[4] || null},
          email6 = ${verificationResults[5] || null},
          lastverificationdate = NOW()
        WHERE id = ${id};
      `;

      const updateResult = await sql`
        SELECT * FROM company_compl 
        WHERE id = ${id};
      `;

      console.log("Updated company info:", updateResult);

      await UpdateBalance(clerkUserId, emails.length); // Subtract credits
      await MakeTransactions(
        clerkUserId,
        -emails.length,
        `${company.company_name} : Emails verified`,
        "Completed",
        "Email verification service fee"
      );

      return {
        id: company.id,
        companyName: company.company_name,
        companyDomain: company.company_domain,
        emails: verificationResults,
        creationDate: company.creationdate,
        lastVerificationDate: updateResult[0].lastverificationdate,
      };
    }
  } catch (err) {
    console.error(`Error fetching details for ID ${id}: ${err.message}`);
    throw new Error(`Error fetching details for ID ${id}: ${err.message}`);
  }
}

async function UpdateBalance(clerkUserId, credit) {
  try {
    const userQuery = await sql`
      UPDATE users
      SET credits = credits - ${credit}
      WHERE clerk_user_id = ${clerkUserId}
      RETURNING *;
    `;

    return userQuery;
  } catch (error) {
    console.error("Error updating balance:", error.message);
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
    console.error("Error making transaction:", error.message);
    throw new Error("Internal Server Error");
  }
}

const getOrCreateUserCredits = async (clerkUserId, email, firstName) => {
  try {
    const userQuery = await sql`
      SELECT * FROM users 
      WHERE clerk_user_id = ${clerkUserId};
    `;

    let userCredits;
    if (userQuery.length === 0) {
      const insertQuery = await sql`
        INSERT INTO users (clerk_user_id, email, first_name, services)
        VALUES (${clerkUserId}, ${email}, ${firstName}, '{}')
        RETURNING credits;
      `;

      userCredits = insertQuery[0].credits;
      await MakeTransactions(
        clerkUserId,
        10,
        "Signup Bonus",
        "Completed",
        "Bonus for signing up"
      );
    } else {
      userCredits = userQuery[0].credits;
    }

    return userCredits;
  } catch (error) {
    console.error(
      "Error fetching or inserting user information:",
      error.message
    );
    throw new Error("Internal Server Error");
  }
};

const getTheArray = async (clerkUserId) => {
  try {
    const result = await sql`
      SELECT services
      FROM users
      WHERE clerk_user_id = ${clerkUserId};
    `;

    if (result.length === 0) {
      throw new Error(`No user found with clerk_user_id: ${clerkUserId}`);
    }

    return result[0].services;
  } catch (error) {
    console.error(
      `Error fetching services array for user ${clerkUserId}:`,
      error.message
    );
    throw new Error("Internal Server Error");
  }
};

async function getTransactions(clerkUserId) {
  try {
    const userQuery = await sql`
        SELECT * FROM transactions 
      WHERE user_id = ${clerkUserId}
      ORDER BY transaction_date DESC;
    `;

    return userQuery;
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    throw new Error("Internal Server Error");
  }
}

async function AddCompanyIdToUser(clerkUserId, id, company_name) {
  try {
    // Update the user's services array by appending the new service ID
    await sql`
      UPDATE users
      SET services = array_append(services, ${id})
      WHERE clerk_user_id = ${clerkUserId};
    `;

    // Deduct credits for the service charge
    await UpdateBalance(clerkUserId, 1); // Assuming credits are deducted, so pass a positive value

    // Log the transaction
    await MakeTransactions(
      clerkUserId,
      -1, // Assuming that -1 represents the deduction of 1 credit
      `${company_name} : Emails Unlocked`,
      "Completed",
      "Service charge for unlocking emails"
    );

    return { success: true };
  } catch (error) {
    console.error("Error updating user services:", error.message);
    throw new Error("Internal Server Error");
  }
}

const redeemCoupon = async (clerkUserId, couponCode) => {
  try {
    const coupon = await sql`
      SELECT * FROM coupons
      WHERE code = ${couponCode} AND is_active = TRUE
    `;
    console.log("Coupon:", coupon);

    if (coupon.length === 0) {
      throw new Error("Invalid or expired coupon");
    }

    const couponData = coupon[0];

    if (new Date(couponData.expiry_date) < new Date()) {
      throw new Error("Coupon has expired");
    }

    const redemption = await sql`
      SELECT * FROM redemptions
      WHERE coupon_id = ${couponData.id} AND user_id = ${clerkUserId}
    `;
    console.log("Redemption:", redemption);

    if (redemption.length > 0) {
      throw new Error("Coupon already redeemed by this user");
    }

    await UpdateBalance(clerkUserId, -couponData.value);

    await MakeTransactions(
      clerkUserId,
      couponData.value,
      `${couponCode} : Redeemed`,
      "Completed",
      "Get credits for redeeming coupon"
    );

    await sql`
      INSERT INTO redemptions (user_id, coupon_id)
      VALUES (${clerkUserId}, ${couponData.id})
    `;

    return {
      message: "Coupon redeemed successfully",
      credits: couponData.value,
    };
  } catch (error) {
    console.error("Error redeeming coupon:", error.message);
    throw new Error("Internal Server Error");
  }
};

async function getInsights() {
  try {
    const result = await sql`SELECT * FROM insights ORDER BY id DESC LIMIT 1;`;

    const company = result[0];

    // Parse the daily_verification_counts field
    if (company && company.daily_verification_counts) {
      company.daily_verification_counts = JSON.parse(
        company.daily_verification_counts
      );
    }

    return {
      company,
    };
  } catch (error) {
    console.error("Error executing query:", error);
    throw new Error("Internal Server Error");
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

module.exports = {
  getPgVersion,
  findCompanyByPattern,
  printTableContents,
  findCompaniesByIds,
  verifyCompanyEmails,
  getOrCreateUserCredits,
  getTheArray,
  getTransactions,
  AddCompanyIdToUser,
  redeemCoupon,
  getInsights,
  getCompensationStats,
  getAllCompensation,
  getLeetcodeCompensation,
  getIITcodeCompensation,
};
