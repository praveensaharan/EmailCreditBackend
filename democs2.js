const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const sql = require("./db"); // Ensure this connects to your PostgreSQL database

const results = [];

// Read CSV file
fs.createReadStream("merged_data.csv")
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", async () => {
    for (const row of results) {
      console.log(
        `Inserting data for company: ${row.Company} with role: ${row.Role}`
      );

      try {
        await sql`
          INSERT INTO All_Compensation (company, role, date, total_salary, base_salary, experience)
          VALUES (
            ${row.Company},
            ${row.Role},
            ${row.Date},
            ${row["Total Salary"]},
            ${row["Base Salary"]},
            ${row.Experience}
          )
        `;
        console.log(`Successfully inserted data for ${row.Company}.`);
      } catch (insertErr) {
        console.error(
          "Error inserting data for company:",
          row.Company,
          insertErr
        );
      }
    }

    console.log("Data insertion process completed.");
  });
