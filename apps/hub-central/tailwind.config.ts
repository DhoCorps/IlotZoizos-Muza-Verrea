import type { Config } from 'tailwindcss';

export default {
  // On indique au moteur où chercher tes balises Bio-Tech
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;