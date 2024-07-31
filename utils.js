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
      SELECT id, company_name, email1, email2, email3 FROM company_info
      WHERE company_name ILIKE ${sqlPattern}
      OR company_domain ILIKE ${sqlPattern}`;

    return companyDetails;
  } catch (err) {
    throw new Error(
      `Error fetching details for pattern "${pattern}": ${err.message}`
    );
  }
}

async function printTableContents() {
  try {
    const tableContents = await sql`SELECT * FROM company_info LIMIT 200`;

    // Transforming the data
    const transformedContents = tableContents.map((company) => {
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
    throw new Error(`Error fetching table contents: ${err.message}`);
  }
}

async function findCompaniesByIds(ids) {
  try {
    const companyDetails = await sql`
      SELECT * FROM company_info 
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

async function verifyCompanyEmails(id) {
  try {
    const result = await sql`
      SELECT * FROM company_info 
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
        DELETE FROM company_info 
        WHERE id = ${id};
      `;
      console.log(
        `Company with ID ${id} deleted because all emails are invalid.`
      );
      return null;
    } else {
      await sql`
        UPDATE company_info
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

      const updateresult = await sql`
        SELECT * FROM company_info 
        WHERE id = ${id};
      `;
      console.log("Updated company info:", updateresult);

      return {
        id: company.id,
        companyName: company.company_name,
        companyDomain: company.company_domain,
        emails: verificationResults,
        creationDate: company.creationdate,
        lastVerificationDate: updateresult[0].lastverificationdate,
      };
    }
  } catch (err) {
    console.error(`Error fetching details for ID ${id}: ${err.message}`);
    throw new Error(`Error fetching details for ID ${id}: ${err.message}`);
  }
}

const getOrCreateUserCredits = async (clerkUserId, email, firstName) => {
  try {
    const userQuery = await sql`
      SELECT * FROM users 
      WHERE clerk_user_id = ${clerkUserId};
    `;

    if (userQuery.length === 0) {
      const insertQuery = await sql`
        INSERT INTO users (clerk_user_id, email, first_name, services)
        VALUES (${clerkUserId}, ${email}, ${firstName}, '{}')
        RETURNING credits;
      `;

      return insertQuery[0].credits;
    } else {
      return userQuery[0].credits;
    }
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

module.exports = {
  getPgVersion,
  findCompanyByPattern,
  printTableContents,
  findCompaniesByIds,
  verifyCompanyEmails,
  getOrCreateUserCredits,
  getTheArray,
};
