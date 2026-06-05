import { defineConfig } from "vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { viteStaticCopy } from "vite-plugin-static-copy"; // <-- Añade esta línea

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		viteStaticCopy({
			targets: [
				{
					src: "src/game/public/assets/**/*", // <-- Carpeta de origen
					dest: "assets", // <-- Carpeta destino en dist
				},
			],
		}),
	],
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
