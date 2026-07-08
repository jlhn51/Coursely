import { AuthCard } from "@/components/auth-card";

export default function SignInPage() {
  return (
    <main className="grid flex-1 place-items-center px-6 py-16">
      <div className="w-full max-w-[440px]">
        <AuthCard mode="sign-in" />
      </div>
    </main>
  );
}
