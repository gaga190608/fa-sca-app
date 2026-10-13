// Instalável: no iPhone, Compartilhar → Adicionar à Tela de Início.
export default function manifest() {
  return {
    name: "Faísca",
    short_name: "Faísca",
    description: "Assistente de ideias e organização.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0706",
    theme_color: "#FF3D2E",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
