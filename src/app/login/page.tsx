import { signInWithGoogle } from "./actions";
import { EmailButtons } from "./email-buttons";
import { GoogleButton } from "./google-button";

const ERRORS: Record<string, string> = {
  google: "No se pudo conectar con Google. Inténtalo de nuevo.",
  sesion:
    "No se pudo completar el inicio de sesión. Si acabas de confirmar tu correo, tu cuenta ya está activa: entra con tu correo y contraseña.",
  credenciales: "Correo o contraseña incorrectos.",
  "sin-confirmar": "Aún no has confirmado tu correo. Revisa tu bandeja de entrada.",
  "ya-existe": "Ese correo ya tiene cuenta. Pulsa Entrar.",
  espera: "Espera un minuto antes de volver a intentarlo.",
  "contrasena-debil": "La contraseña es demasiado débil. Usa al menos 6 caracteres.",
  registro: "No se pudo crear la cuenta. Revisa los datos.",
};

const FIELD =
  "w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, mensaje } = await searchParams;
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Mova</h1>
          <p className="text-sm text-neutral-500">Crea. Mueve. Crece.</p>
        </div>

        {errorText && <p className="text-sm text-red-600">{errorText}</p>}
        {mensaje && (
          <p className="text-sm text-green-600">
            Te enviamos un correo para confirmar tu cuenta. Ábrelo en este mismo navegador.
          </p>
        )}

        <form action={signInWithGoogle}>
          <GoogleButton />
        </form>

        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
          o con tu correo
          <span className="h-px flex-1 bg-neutral-300 dark:bg-neutral-700" />
        </div>

        <form className="space-y-3">
          <input name="email" type="email" required placeholder="Correo" className={FIELD} />
          <input name="password" type="password" required minLength={6} placeholder="Contraseña"
            className={FIELD} />
          <EmailButtons />
        </form>
      </div>
    </main>
  );
}
