import SwaggerParser from "@apidevtools/swagger-parser";
import { openapi } from "../docs/openapi.js";

await SwaggerParser.validate(structuredClone(openapi));
const operations = Object.values(openapi.paths).reduce(
  (count, path) => count + Object.keys(path).length,
  0,
);
console.log(
  `OpenAPI hợp lệ: ${Object.keys(openapi.paths).length} đường dẫn, ${operations} thao tác.`,
);
