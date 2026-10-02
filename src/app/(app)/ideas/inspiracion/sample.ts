// Datos de prueba del feed de Inspiración mientras se decide de dónde salen los vídeos (ver PRODUCTO.md).
// Los vídeos son de Mixkit (licencia gratuita); cuentas, textos y cifras son inventados.
export type Reference = {
  id: string;
  platform: "tiktok" | "instagram";
  handle: string;
  name: string;
  caption: string;
  url: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string;
};

const mixkit = (id: number) => `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;

export const SAMPLE_FEED: Reference[] = [
  { id: "r1", platform: "tiktok", handle: "laura.construye", name: "Laura Méndez", url: mixkit(42323),
    caption: "Lo que nadie te cuenta del primer año de tu startup 👇 #emprendimiento #founder #startup",
    views: 1240000, likes: 98400, comments: 1320, shares: 5400, postedAt: "2026-09-28" },
  { id: "r2", platform: "instagram", handle: "diegoenpublico", name: "Diego Ríos", url: mixkit(34486),
    caption: "Así grabo 5 vídeos en 1 hora (mi setup completo) #contenido #productividad",
    views: 386000, likes: 21500, comments: 640, shares: 2100, postedAt: "2026-09-30" },
  { id: "r3", platform: "tiktok", handle: "sofi.skincare.lab", name: "Sofía Lab", url: mixkit(50422),
    caption: "Lancé mi marca con 500 € y esto fue lo que aprendí #marcapersonal #emprendedora",
    views: 2810000, likes: 312000, comments: 4800, shares: 19000, postedAt: "2026-09-25" },
  { id: "r4", platform: "instagram", handle: "marta.vende", name: "Marta Vidal", url: mixkit(42316),
    caption: "3 errores que cometí vendiendo online (el segundo me costó 10.000 €) #ventas #negocio",
    views: 512000, likes: 34100, comments: 910, shares: 3300, postedAt: "2026-09-29" },
  { id: "r5", platform: "tiktok", handle: "pablo.saas", name: "Pablo Ortega", url: mixkit(34477),
    caption: "Día 47 construyendo mi SaaS en público: primeros 10 clientes #buildinpublic #saas",
    views: 94000, likes: 7200, comments: 380, shares: 610, postedAt: "2026-10-01" },
  { id: "r6", platform: "instagram", handle: "andres.calle", name: "Andrés Calle", url: mixkit(34469),
    caption: "Pregunté a 20 desconocidos qué les frena para emprender #calle #emprender",
    views: 1730000, likes: 141000, comments: 2700, shares: 8800, postedAt: "2026-09-27" },
  { id: "r7", platform: "tiktok", handle: "nuria.dice", name: "Nuria Paz", url: mixkit(34487),
    caption: "Mi rutina de mañana como founder (sin romantizar) #rutina #founder",
    views: 668000, likes: 52300, comments: 1100, shares: 2900, postedAt: "2026-09-26" },
];
