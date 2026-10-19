import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { z } from "zod";
import { images } from "./db/schema.js"
import { db } from "./db/index.js"
import { eq } from "drizzle-orm";

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

async function createImage(req: FastifyRequest<{Body: unknown}>, reply: FastifyReply){
    
    const result = CreateImageSchema.safeParse(req.body);

    if(result.success){
        const [imageOut] = await db.insert(images).values(result.data).returning();
        reply.status(201).send(imageOut);
    }else{
        reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 , issues: result.error.issues});
    }
}

const app = Fastify({ logger: true });
app.get("/images", listImages);
app.get<{Params: unknown}>("/images/:id", getImage);
app.post<{Body: unknown}>("/images", createImage);

await app.listen({port: 3000});