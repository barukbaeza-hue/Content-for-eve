import { login, signup } from "./actions";

const ERRORS: Record<string, string> = {
  credenciales: "Correo o contraseña incorrectos.",
  registro: "No se pudo crear la cuenta. Revisa los datos.",
  confirmacion: "El enlace de confirmación no es válido o ha caducado.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, mensaje } = await searchParams;
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <form className="w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Mova</h1>
          <p className="text-sm text-neutral-500">Crea. Mueve. Crece.</p>
        </div>

        <input name="email" type="email" required placeholder="Correo"
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />
        <input name="password" type="password" required minLength={6} placeholder="Contraseña"
          className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-700" />

        {errorText && <p className="text-sm text-red-600">{errorText}</p>}
        {mensaje && <p className="text-sm text-green-600">Te enviamos un correo para confirmar tu cuenta.</p>}

        <div className="flex gap-2">
          <button formAction={login}
            className="flex-1 rounded-lg bg-foreground px-3 py-2 font-medium text-background">
            Entrar
          </button>
          <button formAction={signup}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 font-medium dark:border-neutral-700">
            Crear cuenta
          </button>
        </div>
      </form>
    </main>
  );
}
