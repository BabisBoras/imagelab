import { createServer } from "node:http";


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

const jsonErrorNotFound = JSON.stringify({ message: "", error: "Not found", statusCode: 404 });
const jsonErrorNotAllowed = JSON.stringify( { error: "Method not allowed" });
const jsonErrorNotSupported = JSON.stringify( { error: "Not supported" });
const jsonErrorNoUrl = JSON.stringify( { error: "No URL provided" });

const server = createServer((req, res) => {

    console.log(req.method, req.url);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const mUrl = req.url;
    if(!mUrl){
        res.statusCode = 404;
        res.end(jsonErrorNoUrl);
        return;
    }
    if(req.method !== "GET"){
        res.statusCode = 405;
        res.setHeader("Allow", "GET");
        res.end(jsonErrorNotAllowed);
        return;
    }

    const url = new URL(mUrl, "http://localhost");

    if(url.pathname==="/images") {
        res.end(JSON.stringify(images));
        return;
    }else if(url.pathname.startsWith("/images/")) {
        const imId = url.pathname.slice(8);
        const image = images.find((img) => img.id === imId);
        if(image){
            res.end(JSON.stringify(image));
            return;
        }else{
            res.statusCode = 404;
            res.end(jsonErrorNotFound);
            return;
        }
    }
    res.statusCode = 404;
    res.end(jsonErrorNotFound);
});

server.listen(3000);
console.log("Ο server ακούει στο http://localhost:3000");