import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pushToken } = await request.json();
    if (!pushToken || typeof pushToken !== "string") {
      return NextResponse.json(
        { error: "A valid pushToken string is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await User.findByIdAndUpdate(user._id, {
      expoPushToken: pushToken,
      pushRemindersEnabled: true,
    });

    return NextResponse.json({
      success: true,
      message: "Push token registered successfully",
    });
  } catch (error: any) {
    console.error("Error saving mobile push token:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
