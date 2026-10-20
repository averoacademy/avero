import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "avero_user_secret_key_fallback";
export const USER_COOKIE_NAME = "avero_user_token";

export interface IUserJwtPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

export function signUserToken(payload: IUserJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyUserToken(token: string): IUserJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as IUserJwtPayload;
  } catch {
    return null;
  }
}

export async function getUserFromSession(): Promise<IUser | null> {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(USER_COOKIE_NAME)?.value;

    if (!token) {
      const headerList = await headers();
      const authHeader = headerList.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;

    const decoded = verifyUserToken(token);
    if (!decoded) return null;

    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user || user.isSuspended) return null;

    // Enforce 1 active device session per user account
    if (user.currentSessionId && decoded.sessionId && decoded.sessionId !== user.currentSessionId) {
      return null;
    }

    return user;
  } catch (error) {
    console.error("Error retrieving user session:", error);
    return null;
  }
}

export async function verifyUserRequest(request: NextRequest): Promise<IUserJwtPayload | null> {
  const cookieToken = request.cookies.get(USER_COOKIE_NAME)?.value;
  const authHeader = request.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;

  const token = cookieToken || bearerToken;
  if (!token) return null;

  const decoded = verifyUserToken(token);
  if (!decoded) return null;

  return decoded;
}
