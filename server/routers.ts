import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { searchNearbyMarkets } from "./locations";

export const appRouter = router({
  system: systemRouter,
  locations: router({
    nearby: publicProcedure
      .input(z.object({
        latitude: z.number().finite().min(-90).max(90),
        longitude: z.number().finite().min(-180).max(180),
        radius: z.number().int().min(500).max(5000).default(5000),
      }))
      .query(({ input }) => searchNearbyMarkets(input)),
  }),
});

export type AppRouter = typeof appRouter;
