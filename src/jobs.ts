export type JobStatus = "queued" | "running" | "done" | "failed";


// Learning about interfaces in TypeScript
export interface Job {
    readonly id: string,
    imageId: string,
    status: JobStatus,
}


export function isFinished(status: JobStatus): boolean {
    // console.log("status =", status);
    return status === "done" || status === "failed";
}

// Learning about switch statements in TypeScript
export function statusLabel(status: JobStatus) : string {
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



export type Result = 
{ok: true, value: number} |
{ok: false, error: string};

export function parseWidth(input: string): Result{
    const val = Number(input); // This line converts the input string to a number. Gives NaN if the input is not a valid number.
    if(input.trim() === ""){
        return {ok: false, error: "Empty input"};
    }
    if(!Number.isInteger(val)){
        return {ok: false, error: "Not an integer"};
    }
    if(val <= 0){
        return {ok: false, error: "Is not a positive number"};
    }
    if(val > 20000){
        return {ok: false, error: "Number is too large"};
    }
    return { ok: true, value: val};
}