// routes.js
const express = require("express");
const {
  getPgVersion,
  findCompanyByPattern,
  printTableContents,
  findCompaniesByIds,
  verifyCompanyEmails,
  getOrCreateUserCredits,
  getTheArray,
  getTransactions,
  AddCompanyIdToUser,
} = require("./utils");

const router = express.Router();
const { ClerkExpressRequireAuth } = require("@clerk/clerk-sdk-node");
const { clerkClient } = require("./clerk");

router.get("/credits", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }
  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const userInfo = {
      id: user.id,
      email: user.emailAddresses[0].emailAddress,
      firstName: user.firstName,
    };
    const credits = await getOrCreateUserCredits(
      userInfo.id,
      userInfo.email,
      userInfo.firstName
    );
    res.status(200).json({ credits });
  } catch (error) {
    console.error("Error fetching user information:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

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

router.get(
  "/companies-by-ids",
  ClerkExpressRequireAuth({}),
  async (req, res) => {
    // const ids = [20, 21, 22, 70, 159];
    if (!req.auth || !req.auth.userId) {
      return res.status(401).json({ error: "Unauthenticated!" });
    }
    try {
      const user = await clerkClient.users.getUser(req.auth.userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const ids = await getTheArray(user.id);

      if (!ids || ids.length === 0) {
        return res.status(400).json({ error: "No IDs found for the user" });
      }

      const companies = await findCompaniesByIds(ids);

      if (!companies || companies.length === 0) {
        return res
          .status(404)
          .json({ error: "No companies found for the given IDs" });
      }

      res.json(companies);
    } catch (err) {
      console.error("Error fetching user data or companies:", err.message);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.get("/transactions", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }
  try {
    const user = await clerkClient.users.getUser(req.auth.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const transactions = await getTransactions(user.id);

    res.json(transactions);
  } catch (err) {
    console.error("Error fetching user data or transactions:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/verify", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Company ID is required" });
    }

    const updatedCompany = await verifyCompanyEmails(id, user.id);
    return res.json(updatedCompany);
  } catch (err) {
    console.error("Error verifying company emails:", err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/AddToUser", ClerkExpressRequireAuth({}), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const user = await clerkClient.users.getUser(req.auth.userId);
    const { id, companyName } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Company ID is required" });
    }
    if (!companyName) {
      return res.status(400).json({ error: "Company Name is required" });
    }

    await AddCompanyIdToUser(user.id, id, companyName);

    res.status(200).json({ message: "Company ID added successfully" });
  } catch (err) {
    console.error("Error adding company ID to user:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
