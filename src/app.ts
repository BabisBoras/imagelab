import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";

interface ImageInfo{
    id: string;
    name: string;
    width: number;
    height: number;
}

const images: ImageInfo[] = [
    { id: "1", name: "image1.jpg", width: 800, height: 600 },
    { id: "2", name: "image2.png", width: 1024, height: 768 },
    { id: "3", name: "image3.gif", width: 640, height: 480 },
    { id: "4", name: "image4.jpeg", width: 1280, height: 960 },
];


function listImages(req: FastifyRequest, res: FastifyReply) {
  res.send(images);
}

function getImage(req: FastifyRequest<{Params: {id: string}}>, res: FastifyReply) {
    const imageId = req.params.id;
    const image = images.find((img) => img.id===imageId);
    if(image){
        res.send(image);
    }else{
        res.status(404).send({ error: "Not found" });
    }
}

const app = Fastify({ logger: true });
app.get("/images", listImages);
app.get<{Params: {id: string}}>("/images/:id", getImage);

await app.listen({port: 3000});