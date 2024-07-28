// const sql = require("./db");
// const axios = require("axios");

// async function verifyEmail(email) {
//   try {
//     const response = await axios.get("https://api.skrapp.io/v3/verify", {
//       params: { email },
//       headers: {
//         "X-Access-Key": ,
//         "Content-Type": "application/json",
//       },
//     });

//     if (response.data.email_status === "invalid") {
//       return { email, status: 0 };
//     } else {
//       return { email, status: 1 };
//     }
//   } catch (error) {
//     console.error(`Error verifying email ${email}: ${error.message}`);
//     return { email, status: "verification_failed" };
//   }
// }

// async function verifyCompanyEmails(id) {
//   try {
//     const result = await sql`
//       SELECT * FROM company_info
//       WHERE id = ${id};
//     `;

//     if (result.length === 0) {
//       throw new Error(`No company found with ID ${id}`);
//     }

//     const company = result[0];
//     const emails = [
//       company.email1,
//       company.email2,
//       company.email3,
//       company.email4,
//       company.email5,
//       company.email6,
//     ].filter((email) => email);

//     console.log(emails);

//     const verificationResults = [];

//     for (const email of emails) {
//       const verificationResult = await verifyEmail(email);
//       if (verificationResult.status === 1) {
//         verificationResults.push(verificationResult.email);
//       }
//     }
//     console.log(verificationResults);

//     if (verificationResults.length === 0) {
//       await sql`
//         DELETE FROM company_info
//         WHERE id = ${id};
//       `;
//       console.log(
//         `Company with ID ${id} deleted because all emails are invalid.`
//       );
//       return null;
//     } else {
//       await sql`
//         UPDATE company_info
//         SET
//           email1 = ${verificationResults[0] || null},
//           email2 = ${verificationResults[1] || null},
//           email3 = ${verificationResults[2] || null},
//           email4 = ${verificationResults[3] || null},
//           email5 = ${verificationResults[4] || null},
//           email6 = ${verificationResults[5] || null},
//           lastverificationdate = NOW()
//         WHERE id = ${id};
//       `;

//      const updateresult = await sql`
//       SELECT * FROM company_info
//       WHERE id = ${id};
//     `;
//     console.log(updateresult);
//        return {
//          id: company.id,
//          companyName: company.company_name,
//          companyDomain: company.company_domain,
//          emails: verificationResults,
//          creationDate: company.creationdate,
//          lastVerificationDate: updateresult.lastVerificationDate,
//        };
//     }

//   } catch (err) {
//     throw new Error(`Error fetching details for ID ${id}: ${err.message}`);
//   }
// }

// async function main() {
//   try {
//     const result = await verifyCompanyEmails(22);
//     console.log(result);
//   } catch (error) {
//     console.error("Error:", error);
//   }
// }

// main();

const sql = require("./db");
const axios = require("axios");

async function verifyEmail(email) {
  try {
    const response = await axios.get("https://api.skrapp.io/v3/verify", {
      params: { email },
      headers: {
        "X-Access-Key": "xxxxxx",
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

async function main() {
  try {
    const result = await verifyCompanyEmails(22);
    console.log("Final result:", result);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
