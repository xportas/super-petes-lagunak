import { z } from "zod";

export const esquemaTema = z.enum(["light", "dark"]);

export const esquemaModoPete = z.enum(["0", "1"]);

export const esquemaPreferencias = z.object({
  modo_pete: esquemaModoPete.optional(),
  tema: esquemaTema.optional(),
});
