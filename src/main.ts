// Hello world message in console:
const msg: string = "ImageLab ξεκινά";
console.log(msg);


// Learning about const and let in TypeScript
const width = 800;
let height = 600;

height = 768;
// width = 1024; // This line would cause a TypeScript error because 'width' is a constant and cannot be reassigned.

console.log(width, height);


// Learning about string types in TypeScript
const status1 = "queued";
let status2 = "processing";

// Learning about union types in TypeScript
type JobStatus = "queued" | "running" | "done" | "failed";
let status: JobStatus = "queued";

status = "running";

// status = "finished"; // This line would cause a TypeScript error because "finished" is not a valid JobStatus value.


// Learning about interfaces in TypeScript
interface Job {
    readonly id: string,
    imageId: string,
    status: JobStatus,
}

const job: Job = {
    id: "GammaCorrection",
    imageId: "image1",
    status: "queued"
}

job.status = "running"; // This is valid because "running" is a valid JobStatus value.

// job.id = "NewID"; // This line would cause a TypeScript error because 'id' is a readonly property and cannot be reassigned.


//  Learning about functions in TypeScript
function area(w: number, h: number): number {
    return w * h;
}

function isFinished(status: JobStatus)  {
    console.log("status =", status); // true
    return status === "done" || status === "failed";
}

console.log(isFinished("done")); // true
console.log(isFinished("running")); // false


// Learning about switch statements in TypeScript
function statusLabel(status: JobStatus) : string {
    switch (status) {
        case "queued":
            return "Σε αναμονή";
        case "running":
            return "Σε επεξεργασία";
        case "done":
            return "Ολοκληρώθηκε";
        case "failed":
            return "Απέτυχε";
        default:
            const check: never = status;
            return "Άγνωστη κατάσταση";
    }
}


type Result = 
{ok: true, value: number} |
{ok: false, error: string};

function parseWidth(input: string): Result{
    const val = Number(input); // This line converts the input string to a number. Gives NaN if the input is not a valid number.
    if(input.trim() === ""){
        return {ok: false, error: "Empty input"};
    }else if(!Number.isInteger(val)){
        return {ok: false, error: "Not an integer"};
    }else if(val <= 0){
        return {ok: false, error: "Is not a positive number"};
    }else if(val > 20000){
        return {ok: false, error: "Number is too large"};
    }
    return { ok: true, value: val};
}

const r = parseWidth("800");
// console.log(r.value);  // This line will cause a TypeScript error because 'r' could be of type {ok: false, error: string} and does not have a 'value' property. We need to check if 'r.ok' is true before accessing 'r.value'.

if(r.ok){
    console.log("Parsed width:", r.value);
}else{
    console.log("Error:", r.error);
}

console.log(parseWidth("800")); 
console.log(parseWidth("")); 
console.log(parseWidth("8.5")); 
console.log(parseWidth("Infinity"));
console.log(parseWidth("abc"));
console.log(parseWidth("-5"));
console.log(parseWidth("     800     ")); 