import { createHash, randomBytes } from "node:crypto";
import { users, sessions } from "../db/schema.js"
import { db } from "../db/index.js"
import { eq, and, gt } from "drizzle-orm"

function hashToken(token: string){
    return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string){

    // create token & hash
    const token = randomBytes(32).toString("base64url");
    const tokenHash = hashToken(token);

    // insert to base (expiresAt 7 days)
    await db.insert(sessions).values({
        id: tokenHash, 
        userId: userId, 
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    // return token (no hash)
    return token;
}

export async function getSessionUser(token: string | undefined){

    if(!token)
        return undefined;
    
    const tokenHash = hashToken(token);

    const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, tokenHash), gt(sessions.expiresAt, new Date())));

    return user;
}


export async function deleteSession(token: string){
    await db.delete(sessions).where(eq(sessions.id,hashToken(token)));
}