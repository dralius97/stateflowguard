import { ErrorType } from "./types";

export class FSMError extends Error {
    constructor(
        message: string,
        public code:  ErrorType,
        public context: unknown
    ){
        super(message)
    }
}