import { Logo } from "@/components/shell/logo";
import { Input, Label } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
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

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, mensaje } = await searchParams;
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-80">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-5 size-9 text-base" />
          <h1 className="text-2xl font-medium">Entra en Mova</h1>
          <p className="mt-1 text-base text-fg-3">Crea. Mueve. Crece.</p>
        </div>

        <div className="space-y-4">
          {errorText && <Notice tone="danger">{errorText}</Notice>}
          {mensaje && (
            <Notice tone="success">
              Te enviamos un correo para confirmar tu cuenta. Ábrelo en este mismo navegador.
            </Notice>
          )}

          <form action={signInWithGoogle}>
            <GoogleButton />
          </form>

          <div className="flex items-center gap-3 text-xs text-fg-4">
            <span className="h-px flex-1 bg-line" />
            o con tu correo
            <span className="h-px flex-1 bg-line" />
          </div>

          <form className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo</Label>
              <Input id="email" name="email" type="email" required autoComplete="email"
                placeholder="tu@correo.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" name="password" type="password" required minLength={6}
                autoComplete="current-password" placeholder="Mínimo 6 caracteres" />
            </div>
            <EmailButtons />
          </form>
        </div>
      </div>
    </main>
  );
}
