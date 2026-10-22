import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { images, users } from "./db/schema.js"
import { db } from "./db/index.js"
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, verifyPasswordDummy } from "./auth/password.js";



const CredentialSchema = z.object({
    email: z.email().max(128),
    password: z.string().min(8).max(128)
});

const CreateImageSchema = z.object({
    name: z.string().min(1).max(255),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
});

const ImageParamsSchema = z.object({
    id: z.uuid(),
})

async function listImages(req: FastifyRequest, reply: FastifyReply) {
    const imagesOut = await db.select().from(images);
    reply.send(imagesOut);
}

async function getImage(req: FastifyRequest<{Params: unknown}>, reply: FastifyReply) {
    const result = ImageParamsSchema.safeParse(req.params);

    if(result.success){
        const mId = result.data.id;
        const [image] = await db.select().from(images).where(eq(images.id,mId));
        if(image){
            reply.send(image);
        }else{
            reply.status(404).send({ message: "", error: "Not found", statusCode: 404 });
        }
    }else{
        // 404 vs 400: has small advantage (not sending information about id format)
        reply.status(404).send({ message: "Image not found", error: "Not found", statusCode: 404 });
        // reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 , issues: result.error.issues});
    }
}

// async function createImage(req: FastifyRequest<{Body: unknown}>, reply: FastifyReply){
    
//     const result = CreateImageSchema.safeParse(req.body);

//     if(result.success){
//         const [imageOut] = await db.insert(images).values(result.data).returning();
//         reply.status(201).send(imageOut);
//     }else{
//         reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 , issues: result.error.issues});
//     }
// }

async function register(req: FastifyRequest, reply: FastifyReply) {
    const result = CredentialSchema.safeParse(req.body);
    if(!result.success){
        reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 , issues: result.error.issues});
        return;
    }

    try{
        const [out] = await db.insert(users)
        .values({
            email: result.data.email.toLowerCase().trim(), 
            passwordHash: await hashPassword(result.data.password)})
            .returning({id: users.id, email: users.email});

        reply.status(201).send(out);
    }catch(err){
        // console.dir(err, { depth: 4 });

        if (err instanceof Error && (err.cause as { code?: string })?.code === "23505") {
            // 409
            reply.status(409).send({ message: "This email is already registered.", error: "Conflict", statusCode: 409 });
            return;
        }
        
        req.log.error(err);
        throw err;
    }
}
async function login(req: FastifyRequest, reply: FastifyReply) {
    const result = CredentialSchema.safeParse(req.body);
    if(!result.success){
        reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 , issues: result.error.issues});
        return;
    }
    const mEmail = result.data.email.toLowerCase().trim();

    const [out] = await db.select().from(users).where(eq(users.email,mEmail));
    if(!out){
        // couldnt find user with this email
        await verifyPasswordDummy();
        reply.status(401).send({ message: "Unauthorized user", error: "Unauthorized", statusCode: 401});
        return;
    }

    const mPassword_ver = await verifyPassword(result.data.password, out.passwordHash);
    if(!mPassword_ver){
        // couldnt verify user
        reply.status(401).send({ message: "Unauthorized user", error: "Unauthorized", statusCode: 401});
        return;
    }

    reply.status(200).send({ id: out.id, email: out.email});
}


const app = Fastify({ logger: true });
app.get("/images", listImages);
app.get<{Params: unknown}>("/images/:id", getImage);
// app.post<{Body: unknown}>("/images", createImage);
app.post("/auth/register", register);
app.post("/auth/login", login);

await app.listen({port: 3000});