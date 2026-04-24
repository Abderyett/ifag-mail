import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:8000',
				changeOrigin: true,
			},
		},
	},
	build: {
		outDir: '../backend/public', // Build output to the 'public' directory in backend
		emptyOutDir: true,
	},
	base: '/',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
