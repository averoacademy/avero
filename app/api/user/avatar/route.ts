import { NextResponse } from "next/server";
import { getUserFromSession } from "@/lib/userAuth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(sessionUser._id).select("avatar");

    return NextResponse.json({
      success: true,
      avatarUrl: user?.avatar || "",
    });
  } catch (error: any) {
    console.error("GET /api/user/avatar error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to retrieve avatar." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { avatar } = body;

    if (!avatar || typeof avatar !== "string") {
      return NextResponse.json(
        { error: "Image data is required for avatar upload." },
        { status: 400 }
      );
    }

    // Guard against unreasonably large base64 strings (limit to 7MB base64 ~ 5MB raw image)
    if (avatar.length > 7_500_000) {
      return NextResponse.json(
        { error: "Image file exceeds the 5MB size limit. Please choose a smaller image." },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const updatedUser = await User.findByIdAndUpdate(
      sessionUser._id,
      { avatar: avatar.trim() },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Profile picture updated successfully.",
      avatarUrl: updatedUser.avatar,
    });
  } catch (error: any) {
    console.error("POST /api/user/avatar error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update profile picture." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const sessionUser = await getUserFromSession();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await User.findByIdAndUpdate(sessionUser._id, { avatar: "" });

    return NextResponse.json({
      success: true,
      message: "Profile picture removed successfully.",
      avatarUrl: "",
    });
  } catch (error: any) {
    console.error("DELETE /api/user/avatar error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to remove avatar." },
      { status: 500 }
    );
  }
}
