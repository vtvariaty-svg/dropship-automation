import "fastify";

export type ShopContext = {
  shop: string;
  accessToken: string;
};

declare module "fastify" {
  interface FastifyRequest {
    shopContext?: ShopContext;
  }
}
