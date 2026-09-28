import { signInWithGoogle } from "./actions";
import { SubmitButton } from "./submit-button";

const ERRORS: Record<string, string> = {
  google: "No se pudo conectar con Google. Inténtalo de nuevo.",
  sesion: "No se pudo iniciar sesión. Inténtalo de nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;
  const errorText = typeof error === "string" ? ERRORS[error] : undefined;

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <form action={signInWithGoogle} className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Mova</h1>
          <p className="text-sm text-neutral-500">Crea. Mueve. Crece.</p>
        </div>

        {errorText && <p className="text-sm text-red-600">{errorText}</p>}

        <SubmitButton />
      </form>
    </main>
  );
}
