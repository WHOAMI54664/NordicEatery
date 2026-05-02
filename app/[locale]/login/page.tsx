import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
    return (
        <main className="container-page flex min-h-[calc(100vh-96px)] items-center py-12">
            <Suspense fallback={null}>
                <LoginForm />
            </Suspense>
        </main>
    );
}