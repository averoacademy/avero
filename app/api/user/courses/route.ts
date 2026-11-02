import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserFromSession } from "@/lib/userAuth";
import Course from "@/models/Course";
import Category from "@/models/Category";

export async function GET(request: Request) {
  try {
    const user = await getUserFromSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const level = searchParams.get("level") || "";

    await connectToDatabase();

    const query: any = { status: "Published" };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      query.categoryId = category;
    }

    if (level) {
      query.level = level;
    }

    const courses = await Course.find(query)
      .select("title slug description level timeLimitMinutes passingScorePercentage thumbnail categoryId subcategoryName status isFreeAccess freeQuestionLimit createdAt questions._id")
      .populate("categoryId", "name slug icon")
      .sort({ createdAt: -1 })
      .lean();

    const categories = await Category.find({ isActive: true }).sort({ order: 1, name: 1 }).lean();

    return NextResponse.json({
      success: true,
      courses,
      categories,
    });
  } catch (error: any) {
    console.error("Error in /api/user/courses:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch student courses." },
      { status: 500 }
    );
  }
}
