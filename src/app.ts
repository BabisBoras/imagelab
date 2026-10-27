import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { images, users } from "./db/schema.js"
import { db } from "./db/index.js"
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword, verifyPasswordDummy } from "./auth/password.js";
import cookie from "@fastify/cookie";
import { createSession, getSessionUser, deleteSession } from "./auth/session.js"

import multipart from "@fastify/multipart";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { readHeader, probeImage } from "./images/probe.js";

const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR ?? "storage");
const MAX_PIXELS = 50000000; // 50MP ~200MB

const CredentialSchema = z.object({
    email: z.email().max(128),
    password: z.string().min(8).max(128)
});

const ImageParamsSchema = z.object({
    id: z.uuid(),
})

async function listImages(req: FastifyRequest, reply: FastifyReply) {
    
    const user = await requireUser(req, reply);
    if(!user) return;

    const imagesOut = await db.select().from(images).where(eq(images.ownerId, user.id));
    reply.send(imagesOut);
}

async function getImage(req: FastifyRequest<{Params: unknown}>, reply: FastifyReply) {
    
    const user = await requireUser(req, reply);
    if(!user) return;

    const result = ImageParamsSchema.safeParse(req.params);

    if(result.success){
        const mId = result.data.id;
        const [image] = await db.select().from(images).where(and(eq(images.id,mId),eq(images.ownerId,user.id)));
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

    const token = await createSession(out.id);
    reply.setCookie("sid", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 60 * 60 });

    reply.status(200).send({ id: out.id, email: out.email});
}

async function authMe(req: FastifyRequest, reply: FastifyReply) {

    const user = await getSessionUser(req.cookies.sid);

    if(!user){
        reply.status(401).send({ message: "Unauthorized user", error: "Unauthorized", statusCode: 401});
        return;
    }

    reply.status(200).send({id: user.id, email: user?.email});
}


async function logout(req: FastifyRequest, reply: FastifyReply) {
    
    if(!req.cookies.sid){
        reply.status(204).send();
        return;
    }

    await deleteSession(req.cookies.sid);

    reply.clearCookie("sid", { path: "/" });
    reply.status(204).send();
}

async function requireUser(req: FastifyRequest, reply: FastifyReply){
    
    const user = await getSessionUser(req.cookies.sid);

    if(!user){
        reply.status(401).send({ message: "Unauthorized user", error: "Unauthorized", statusCode: 401});
        return undefined;
    }

    return user;
}

async function uploadImage(req: FastifyRequest, reply: FastifyReply){
    
    const user = await requireUser(req, reply);
    if(!user) return;

    if (!req.isMultipart()){
        return reply.code(415).send({
            error: "Unsupported Media Type",
            message: "Only PNG and JPEG images are supported.",
        });
    }
    const data = await req.file(); // { file: stream, filename, mimetype }

    if(!data){
        reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 });
        return;
    }

    const id = randomUUID();

    //const tmpName = STORAGE_DIR+"/"+id+".tmp";
    const tmpName = path.join(STORAGE_DIR, `${id}.tmp`);


    //const fh = await open(tmpName, "w");
    
    try{
        await pipeline(data.file , createWriteStream(tmpName))

        if (data.file.truncated){
            return reply.code(413).send({
                error: "Payload Too Large",
                message: "Image exceeds the maximum allowed size.",
            });
        }

        const probe = probeImage(await readHeader(tmpName))

        if(!probe){
            // data error
            return reply.code(415).send({
                error: "Unsupported Media Type",
                message: "Only PNG and JPEG images are supported.",
            });
        }

        if( probe.height<=0 || probe.height>20000 || probe.width<=0 || probe.width>20000 || probe.width*probe.height>MAX_PIXELS ){
            // reply.status(422).send({ message: "Invalid range or format", error: "Out of range", statusCode: 422 });
            return reply.code(422).send({
                message: "Invalid image dimensions.",
                error: "Unprocessable Content",
                statusCode: 422 
            });
        }


        const size = (await stat(tmpName)).size;

        //const finalName = STORAGE_DIR+"/"+id+probe.format;
        const finalName = path.join(STORAGE_DIR, `${id}.${probe.format}`)

        await rename(tmpName, finalName);

        try {
            const [imageOut] = await db.insert(images).values({
                id: id,
                ownerId: user.id,
                name: data.filename.slice(0,255) || "no_name",
                width: probe.width,
                height: probe.height,
                format: probe.format,
                sizeBytes: size,
            }).returning();
            reply.status(201).send(imageOut);
        } catch (err) {
            await rm(finalName, { force: true });
            throw err;
        }

    }finally{
        await rm(tmpName, { force: true } );
    }


}




const app = Fastify({ logger: true });
await app.register(cookie);
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024, files: 1 } })
await mkdir(STORAGE_DIR, { recursive: true })

app.get("/images", listImages);
app.get<{Params: unknown}>("/images/:id", getImage);
app.get("/auth/me", authMe);
app.post("/auth/register", register);
app.post("/auth/login", login);
app.post("/auth/logout", logout);

app.post("/images", uploadImage);


await app.listen({port: 3000});