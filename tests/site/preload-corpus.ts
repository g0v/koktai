/** Warm module-level corpus cache before site tests (CI cold extract is >5s). */
import { getCorpus } from "../../lib/site/corpus.ts";

getCorpus(process.cwd());