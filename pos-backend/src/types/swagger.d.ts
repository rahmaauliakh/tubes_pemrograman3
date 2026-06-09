declare module "swagger-jsdoc" {
  type SwaggerJsdocOptions = {
    definition: Record<string, unknown>;
    apis: string[];
  };

  const swaggerJsdoc: (options: SwaggerJsdocOptions) => Record<string, unknown>;

  export default swaggerJsdoc;
}

declare module "swagger-ui-express" {
  import { RequestHandler } from "express";

  const swaggerUi: {
    serve: RequestHandler[];
    setup: (swaggerDoc: Record<string, unknown>) => RequestHandler;
  };

  export = swaggerUi;
}
