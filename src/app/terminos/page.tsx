import type { Metadata } from "next";
import { Legal } from "@/components/shell/legal";

export const metadata: Metadata = { title: "Términos del servicio · Mova" };

export default function TerminosPage() {
  return (
    <Legal title="Términos del servicio" updated="30 de septiembre de 2026">
      <p>
        Mova es una herramienta para creadores de contenido: ayuda a sacar ideas, edita tus vídeos, los programa en un
        calendario y los publica en tus redes sociales (Instagram y TikTok). Al usar Mova aceptas estos términos.
      </p>
      <h2>Tu cuenta</h2>
      <ul>
        <li>Eres responsable de tu cuenta y de lo que se haga con ella.</li>
        <li>Puedes conectar tus cuentas de Instagram y TikTok y desconectarlas cuando quieras.</li>
      </ul>
      <h2>Tu contenido</h2>
      <ul>
        <li>Los vídeos, textos y datos que subes son tuyos. Nos das permiso solo para procesarlos (editarlos, guardarlos y publicarlos) cuando tú lo pides.</li>
        <li>Mova publica en tus redes únicamente los vídeos que tú programas, en la fecha y hora que eliges y con el texto que escribes.</li>
        <li>Eres responsable de que tu contenido cumpla las normas de cada red social y no infrinja derechos de terceros.</li>
      </ul>
      <h2>Uso aceptable</h2>
      <p>No uses Mova para publicar spam, contenido ilegal o que incumpla las normas de Instagram o TikTok.</p>
      <h2>Servicio</h2>
      <p>
        Mova se ofrece tal cual. Trabajamos para que funcione bien, pero no garantizamos que esté siempre disponible ni
        que las redes sociales acepten cada publicación. Podemos cambiar estos términos y te avisaremos de los cambios
        importantes.
      </p>
      <h2>Contacto</h2>
      <p>Para cualquier duda escríbenos al correo de contacto de Mova.</p>
    </Legal>
  );
}
