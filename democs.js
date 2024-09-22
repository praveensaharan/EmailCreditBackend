const fs = require("fs");
const path = require("path");
const sql = require("./db"); // Ensure this connects to your PostgreSQL database

// Read JSON file
fs.readFile("final_company_data.json", "utf8", async (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  const companies = JSON.parse(data);

  for (const company of companies) {
    console.log(
      `Inserting data for company: ${company.name} with role: ${company.type}`
    );

    try {
      await sql`
            INSERT INTO IIT_Compensation (Company, Role, Date, Description, CTC, Gross)
            VALUES (
                ${company.name},
                ${company.type},
                ${company.date},
                ${company.description},
                ${company.ctc},
                ${company.gross}
            )
        `;
      console.log(`Successfully inserted data for ${company.name}.`);
    } catch (insertErr) {
      console.error(
        "Error inserting data for company:",
        company.name,
        insertErr
      );
    }
  }

  console.log("Data insertion process completed.");
});
