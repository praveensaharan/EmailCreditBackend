const sql = require("./db");
const axios = require("axios");

const redeemCoupon = async (clerkUserId, couponCode) => {
  // Fetch coupon
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

  // Check if the coupon has already been redeemed by this user
  const redemption = await sql`
    SELECT * FROM redemptions
    WHERE coupon_id = ${couponData.id} AND user_id = ${clerkUserId}
  `;

  if (redemption.length > 0) {
    throw new Error("Coupon already redeemed by this user");
  }
  console.log("Coupon Data:", redemption);
  await sql`
    INSERT INTO redemptions (user_id, coupon_id)
    VALUES (${clerkUserId}, ${couponData.id})
  `;

  return { message: "Coupon redeemed successfully", credits: couponData.value };
};

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

async function main() {
  try {
    // const result1 = await MakeTransactions(
    //   "user_2issiUUcFXXMO569jyWpL6shrX1",
    //   -1,
    //   "Clerk Emails",
    //   "Completed",
    //   "Service charge for unlocking emails"
    // );
    const result = await redeemCoupon(
      `user_2issiUUcFXXMO569jyWpL6shrX1`,
      "SAVE10"
    );
    console.log("Final result:", result);
  } catch (error) {
    console.error("Error:", error.message); // Improved error handling
  }
}

main();
