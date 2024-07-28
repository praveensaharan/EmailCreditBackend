// routes.js
const express = require("express");
const {
  getPgVersion,
  findCompanyByPattern,
  printTableContents,
  findCompaniesByIds,
  verifyCompanyEmails,
} = require("./utils");

const router = express.Router();

router.get("/version", async (req, res) => {
  try {
    const version = await getPgVersion();
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/companies", async (req, res) => {
  const pattern = req.query.pattern || "";
  try {
    const companies = await findCompanyByPattern(pattern);
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/table-contents", async (req, res) => {
  try {
    const contents = await printTableContents();
    res.json(contents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/companies-by-ids", async (req, res) => {
  const ids = [20, 21, 22, 70, 159];
  if (!ids.length) {
    return res.status(400).json({ error: "No IDs provided" });
  }
  try {
    const companies = await findCompaniesByIds(ids);
    res.json(companies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify", async (req, res) => {
  const { id } = req.body;
  try {
    if (!id) {
      return res.status(400).json({ error: "Key is required" });
    }
    const updatedCompany = await verifyCompanyEmails(id);
    res.json(updatedCompany);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
