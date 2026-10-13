import "./globals.css";

export const metadata = {
  title: "Faísca 🔥",
  description: "Sua assistente de ideias: te mostra o caminho, não a resposta pronta — e te ajuda a decidir por onde começar.",
  appleWebApp: { capable: true, title: "Faísca", statusBarStyle: "black-translucent" },
};

// Inputs têm 16px, então o iPhone não dá zoom sozinho.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#0E0706" },
  ],
};

// Aplica o tema salvo ANTES de pintar a tela (evita piscar).
const THEME_SCRIPT = `try{var t=(JSON.parse(localStorage.getItem("fa:profile"))||{}).theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
