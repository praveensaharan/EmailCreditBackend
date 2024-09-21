const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const sql = require("./db"); // Ensure this connects to your PostgreSQL database

const filePath = path.join(__dirname, "leetcode_compensation_all_pages.csv");

// Function to read and parse the CSV file
async function readCSVFile(filePath) {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data)) // Push each row into the results array
      .on("end", async () => {
        try {
          // Loop through the parsed CSV data
          for (const entry of results) {
            await insertIfNewCompany(
              entry.ID,
              entry.Link,
              entry.Company,
              entry.Location,
              entry.Date,
              entry.Role,
              entry["Role-Secondary"],
              entry.Experience,
              entry["Total Salary"],
              entry["Base Salary"]
            );
          }
          resolve();
        } catch (error) {
          console.error("Error processing CSV data:", error.message);
          reject(error);
        }
      })
      .on("error", (error) => {
        console.error("Error reading the file:", error);
        reject(error);
      });
  });
}

// Function to insert data only if the company is new
async function insertIfNewCompany(
  entry_id,
  link,
  company,
  location,
  date,
  role,
  role_secondary,
  experience,
  total_salary,
  base_salary
) {
  try {
    // Check for valid input
    if (
      !entry_id ||
      !link ||
      !company ||
      !date ||
      isNaN(experience) ||
      isNaN(total_salary) ||
      isNaN(base_salary)
    ) {
      throw new Error("Invalid input data");
    }

    // Query to check if the company already exists for the given entry_id
    const existingCompany = await sql`
      SELECT * FROM leetcodetable
      WHERE entry_id = ${entry_id}
      AND company = ${company}
      AND role = ${role}
    `;

    // Only insert if no such record exists
    if (existingCompany.length === 0) {
      await sql`
        INSERT INTO leetcodetable (
          entry_id, link, company, location, date, role, role_secondary, experience, total_salary, base_salary
        ) VALUES (
          ${entry_id}, ${link}, ${company}, ${
        location || "N/A"
      }, ${date}, ${role}, ${role_secondary}, ${experience}, ${total_salary}, ${base_salary}
        )
      `;

      console.log(
        `Successfully inserted new company: ${company}, role: ${role}, entry_id: ${entry_id}`
      );
    } else {
      console.log(
        `Company ${company} with role ${role} already exists for entry_id: ${entry_id}, skipping insertion.`
      );
    }
  } catch (err) {
    console.error(`Error inserting entry_id: ${entry_id}`, err.message);
    throw err;
  }
}

// Start the CSV processing and insertion
readCSVFile(filePath)
  .then(() => {
    console.log("CSV processing complete.");
  })
  .catch((error) => {
    console.error("CSV processing failed:", error.message);
  });
