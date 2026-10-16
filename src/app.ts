import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { parseDimension } from "./jobs.js";
import { z } from "zod";



const CreateImageSchema = z.object({
    name: z.string().min(1).max(255),
    width: z.number().int().positive().max(20000),
    height: z.number().int().positive().max(20000),
});

type CreateImageInput = z.infer<typeof CreateImageSchema>;
type ImageInfo = CreateImageInput & { id: string };

// interface ImageInfo{
//     id: string;
//     name: string;
//     width: number;
//     height: number;
// }

const images: ImageInfo[] = [
    { id: "1", name: "image1.jpg", width: 800, height: 600 },
    { id: "2", name: "image2.png", width: 1024, height: 768 },
    { id: "3", name: "image3.gif", width: 640, height: 480 },
    { id: "4", name: "image4.jpeg", width: 1280, height: 960 },
];


function listImages(req: FastifyRequest, reply: FastifyReply) {
  reply.send(images);
}

function getImage(req: FastifyRequest<{Params: {id: string}}>, reply: FastifyReply) {
    const imageId = req.params.id;
    const image = images.find((img) => img.id===imageId);
    if(image){
        reply.send(image);
    }else{
        reply.status(404).send({ message: "", error: "Not found", statusCode: 404 });
    }
}

function createImage(req: FastifyRequest<{Body: unknown}>, reply: FastifyReply){
    const result = CreateImageSchema.safeParse(req.body);
    if(result.success){
        const newId = crypto.randomUUID();
        const newImage = {"id":newId, ...result.data};
        images.push(newImage);
        reply.status(201).send(newImage);
    }else{
        reply.status(400).send({ message: "Invalid Request", error: "Bad Request", statusCode: 400 , issues: result.error.issues});
    }
}

const app = Fastify({ logger: true });
app.get("/images", listImages);
app.get<{Params: {id: string}}>("/images/:id", getImage);
app.post<{Body: unknown}>("/images", createImage);

await app.listen({port: 3000});