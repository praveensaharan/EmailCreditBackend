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
  redeemCoupon,
  getInsights,
  getAllCompensation,
  getLeetcodeCompensation,
  getIITcodeCompensation,
  getCompensationStats,
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
        return res.status(200).json([]);
      }

      const companies = await findCompaniesByIds(ids);

      if (!companies || companies.length === 0) {
        return res.status(200).json([]);
      }

      res.status(200).json(companies);
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

router.post("/redeem-coupon", ClerkExpressRequireAuth(), async (req, res) => {
  if (!req.auth || !req.auth.userId) {
    return res.status(401).json({ error: "Unauthenticated!" });
  }

  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      return res.status(400).json({ error: "Coupon code is required" });
    }
    console.log("Coupon code:", couponCode);

    const result = await redeemCoupon(req.auth.userId, couponCode);
    if (result && result.message) {
      return res.status(200).json(result); // Send 200 OK with the result
    } else {
      return res.status(500).json({ error: "Unexpected error occurred" });
    }
  } catch (err) {
    console.error("Error redeeming coupon:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/search/:pattern", async (req, res) => {
  const pattern = req.params.pattern;
  console.log("pattern", pattern);
  try {
    const companyDetails = await findCompanyByPattern(pattern);
    res.json(companyDetails);
  } catch (err) {
    res.status(500).json({
      error: `Failed to search for companies matching pattern "${pattern}"`,
    });
  }
});

router.get("/insights", async (req, res) => {
  try {
    const Details = await getInsights();
    res.json(Details);
  } catch (err) {
    res.status(500).json({
      error: `Failed`,
    });
  }
});

// Route for searching in all_compensation
router.get("/search-all/:pattern?", async (req, res) => {
  const pattern = req.params.pattern || ""; // Default to an empty string if no pattern is provided
  console.log("Search pattern in all_compensation:", pattern);

  try {
    const companyDetails = await getAllCompensation(pattern);
    res.json(companyDetails);
  } catch (err) {
    console.error("Error in /search-all:", err);
    res.status(500).json({
      error: `Failed to search for companies matching pattern "${pattern}" in all_compensation`,
    });
  }
});

// Route for searching in leetcodetable
router.get("/search-leetcode/:pattern?", async (req, res) => {
  const pattern = req.params.pattern || ""; // Default to an empty string if no pattern is provided
  console.log("Search pattern in leetcodetable:", pattern);

  try {
    const companyDetails = await getLeetcodeCompensation(pattern);
    res.json(companyDetails);
  } catch (err) {
    console.error("Error in /search-leetcode:", err);
    res.status(500).json({
      error: `Failed to search for companies matching pattern "${pattern}" in leetcodetable`,
    });
  }
});

// Route for searching in iit_compensation
router.get("/search-iit/:pattern?", async (req, res) => {
  const pattern = req.params.pattern || ""; // Default to an empty string if no pattern is provided
  console.log("Search pattern in iit_compensation:", pattern);

  try {
    const companyDetails = await getIITcodeCompensation(pattern);
    res.json(companyDetails);
  } catch (err) {
    console.error("Error in /search-iit:", err);
    res.status(500).json({
      error: `Failed to search for companies matching pattern "${pattern}" in iit_compensation`,
    });
  }
});

router.get("/compensation-stats/:for?", async (req, res) => {
  // Destructure `for` parameter or default to "all" if not provided
  const xyz = req.params.for || "";
  console.log("Getting compensation stats for:", xyz);

  try {
    const stats = await getCompensationStats(xyz);

    res.json(stats);
  } catch (err) {
    console.error("Error in /compensation-stats/:for:", err);

    res.status(500).json({
      error: `Failed to retrieve compensation stats for table "${xyz}"`,
    });
  }
});

module.exports = router;
