import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Frontend ab 'user_email' bhejega (consistency ke liye)
    const { user_email, name, nodes, edges, projectId, terraform_code } = body;
    
    console.log(`[API_SAVE] Saving for: ${user_email}`);

    const client = await clientPromise;
    const db = client.db();

    // CASE 1: UPDATE
    if (projectId && ObjectId.isValid(projectId)) {
        await db.collection("projects").updateOne(
            { _id: new ObjectId(projectId) },
            { 
              $set: { 
                name, 
                nodes, 
                edges,
                terraform_code, // Save Terraform code too
                updatedAt: new Date() 
              } 
            }
        );
        return NextResponse.json({ success: true, projectId, message: "Updated" });
    } 
    
    // CASE 2: CREATE
    else {
        const newProject = {
            user_email: user_email, // 👈 MATCHING LEGACY SCHEMA
            name: name || "Untitled Project",
            nodes: nodes || [],
            edges: edges || [],
            terraform_code: terraform_code || "",
            created_at: new Date(), // Python style (legacy match)
            updatedAt: new Date()   // Node style
        };
        
        const result = await db.collection("projects").insertOne(newProject);
        return NextResponse.json({ success: true, projectId: result.insertedId, message: "Created" });
    }

  } catch (error) {
    console.error("[API_SAVE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}