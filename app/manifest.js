// Instalável: no iPhone, Compartilhar → Adicionar à Tela de Início.
export default function manifest() {
  return {
    name: "Faísca",
    short_name: "Faísca",
    description: "Assistente de ideias e organização.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
