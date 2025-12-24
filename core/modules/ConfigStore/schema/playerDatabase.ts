import { z } from "zod";
import { typeDefinedConfig } from "./utils";
import { SYM_FIXER_DEFAULT } from "@lib/symbols";

const isProofsEnabled = typeDefinedConfig({
    name: 'Enable Proofs',
    default: true,
    validator: z.boolean(),
    fixer: SYM_FIXER_DEFAULT,
});

export default {
    isProofsEnabled,
} as const;
