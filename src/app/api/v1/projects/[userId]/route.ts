import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params; // URL se email milega
    const email = decodeURIComponent(userId);
    
    console.log(`[API_V1] Fetching projects for: ${email}`);

    const client = await clientPromise;
    const db = client.db();

    // 🛑 FIX: Query 'user_email' instead of 'userId'
    // Hum dono check kar lete hain taaki naya aur purana dono dikhe
    const projects = await db.collection("projects")
      .find({ 
        $or: [
            { user_email: email }, // Legacy Python Data
            { userId: email }      // New Node.js Data (agar koi ban gaya ho)
        ]
      }) 
      .sort({ updatedAt: -1, created_at: -1 }) // Sort by new or old date
      .toArray();

    return NextResponse.json(projects);

  } catch (error) {
    console.error("[API_V1] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}