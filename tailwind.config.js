/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#0a0e17",
                secondary: "#161b22",
                primary: "#3b82f6",
                accent: "#06b6d4",
                border: "rgba(255,255,255,0.1)",
                "card-bg": "#1c2433"
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
