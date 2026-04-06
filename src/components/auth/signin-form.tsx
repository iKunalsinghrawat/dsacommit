"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { signInAction, type ActionState } from "@/lib/actions/auth-actions";

const initialState: ActionState = {};

export function SignInForm() {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input id="email" name="email" type="email" placeholder="student01@dsacommit.dev" required />
        {state.fieldErrors?.email ? (
          <p className="text-sm text-danger">{state.fieldErrors.email[0]}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input id="password" name="password" type="password" placeholder="••••••••" required />
        {state.fieldErrors?.password ? (
          <p className="text-sm text-danger">{state.fieldErrors.password[0]}</p>
        ) : null}
      </div>

      {state.error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p> : null}

      <SubmitButton className="w-full" pendingLabel="Signing you in...">
        Sign in
      </SubmitButton>
    </form>
  );
}
