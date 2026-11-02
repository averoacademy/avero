import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { connectToDatabase } from "@/lib/mongodb";
import Setting from "@/models/Setting";
import Payment from "@/models/Payment";
import { initializePaystackTransaction } from "@/lib/paystack";

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const plan = (body.plan || "pro_monthly") as "pro_monthly" | "pro_annual";

    await connectToDatabase();

    let settings = await Setting.findOne({ key: "site_settings" });
    if (!settings) {
      settings = await Setting.create({ key: "site_settings" });
    }

    const priceNaira =
      plan === "pro_annual"
        ? (typeof settings.annualPriceNaira === "number" ? settings.annualPriceNaira : 20000)
        : (typeof settings.monthlyPriceNaira === "number" ? settings.monthlyPriceNaira : 2000);

    const planCode =
      plan === "pro_annual"
        ? settings.paystackAnnualPlanCode
        : settings.paystackMonthlyPlanCode;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/dashboard?payment=verify`;

    // Amount in Kobo (1 Naira = 100 Kobo)
    const amountKobo = priceNaira * 100;

    const transactionData = await initializePaystackTransaction({
      email: user.email,
      amountKobo,
      planCode: planCode || undefined,
      callbackUrl,
      metadata: {
        userId: user._id.toString(),
        plan,
        amountNaira: priceNaira,
      },
    });

    // Record pending transaction in DB
    await Payment.create({
      userId: user._id,
      reference: transactionData.reference,
      amountNaira: priceNaira,
      plan,
      status: "pending",
    });

    return NextResponse.json({
      success: true,
      authorization_url: transactionData.authorization_url,
      reference: transactionData.reference,
    });
  } catch (error: any) {
    console.error("Error in /api/paystack/initialize:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initialize payment." },
      { status: 500 }
    );
  }
}
