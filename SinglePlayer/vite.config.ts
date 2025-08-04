import { defineConfig } from "vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";


export default defineConfig({
	plugins: [tsconfigPaths()],
  resolve: {
		alias: {
			"@game": path.resolve(__dirname, "./src/game"),
		},
	},
  build: {
    outDir: "dist",
  },
  server: {
    port: 5173,
  },
});
