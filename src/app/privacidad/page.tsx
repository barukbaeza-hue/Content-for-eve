import type { Metadata } from "next";
import { Legal } from "@/components/shell/legal";

export const metadata: Metadata = { title: "Política de privacidad · Mova" };

export default function PrivacidadPage() {
  return (
    <Legal title="Política de privacidad" updated="30 de septiembre de 2026">
      <p>Esta política explica qué datos usa Mova, para qué y cómo puedes borrarlos.</p>
      <h2>Qué datos guardamos</h2>
      <ul>
        <li>Tu correo y los datos de tu perfil de marca que escribes en Mova.</li>
        <li>Los vídeos que subes, sus versiones editadas, sus textos y su calendario de publicación.</li>
        <li>
          Al conectar Instagram o TikTok: tu identificador y nombre de usuario en esa red, tu foto de perfil y los permisos
          (tokens) necesarios para publicar en tu nombre y leer las métricas de tus publicaciones.
        </li>
      </ul>
      <h2>Para qué los usamos</h2>
      <ul>
        <li>Para editar tus vídeos y publicarlos en tus cuentas cuando tú los programas.</li>
        <li>Para mostrarte las métricas de tus publicaciones.</li>
        <li>No vendemos tus datos ni los usamos para publicidad.</li>
      </ul>
      <h2>Datos de TikTok e Instagram</h2>
      <p>
        Solo usamos los permisos que aceptas al conectar cada red, y solo para las funciones descritas aquí. Publicamos
        únicamente los vídeos que tú programas. Puedes retirar el acceso en cualquier momento desde la configuración de
        tu cuenta de TikTok o Instagram, o pidiéndonos que desconectemos la cuenta.
      </p>
      <h2>Dónde se guardan</h2>
      <p>Los datos se guardan en Supabase y los vídeos en Cloudflare R2, con acceso restringido a tu cuenta.</p>
      <h2>Borrar tus datos</h2>
      <p>
        Puedes borrar tus vídeos desde Mova. Para borrar tu cuenta y todos tus datos, escríbenos al correo de contacto
        de Mova y lo haremos en un máximo de 30 días.
      </p>
    </Legal>
  );
}
