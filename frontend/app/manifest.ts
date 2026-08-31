import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FamilyFood 家庭点菜",
    short_name: "FamilyFood",
    description: "记录菜谱、安排菜单和整理采购清单。",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f7f2",
    theme_color: "#15803d",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
