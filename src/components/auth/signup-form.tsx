"use client";

import { Role } from "@/generated/prisma/enums";
import { companySeed, topicSeed } from "@/data/platform-content";
import { useActionState, useState } from "react";

import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { signUpAction, type ActionState } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

const roles = [
  { value: Role.STUDENT, label: "Student" },
  { value: Role.MENTOR, label: "Mentor" },
  { value: Role.COMPANY, label: "Company" },
] as const;

const initialState: ActionState = {};

export function SignUpForm() {
  const [role, setRole] = useState<Role>(Role.STUDENT);
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <input name="role" type="hidden" value={role} />

      <div className="grid gap-3 sm:grid-cols-3">
        {roles.map((item) => (
          <button
            key={item.value}
            className={cn(
              "rounded-2xl border px-4 py-3 text-left text-sm font-medium",
              role === item.value
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border bg-card text-muted hover:border-primary/30",
            )}
            onClick={(event) => {
              event.preventDefault();
              setRole(item.value);
            }}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Full name
          </label>
          <Input id="name" name="name" placeholder="Aarav Menon" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <Input id="email" name="email" type="email" placeholder="you@example.com" required />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <Input id="password" name="password" type="password" placeholder="Strong password" required />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="confirmPassword">
            Confirm password
          </label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="Repeat password"
            required
          />
        </div>
      </div>

      {role === Role.STUDENT ? (
        <div className="space-y-5 rounded-[28px] border border-border bg-card p-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="currentLevel">
                Current level
              </label>
              <Select id="currentLevel" name="currentLevel" defaultValue="BEGINNER">
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="target">
                Target
              </label>
              <Select id="target" name="target" defaultValue="PLACEMENT">
                <option value="PLACEMENT">Placement</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="SWITCH">Switch</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="dailyAvailableHours">
                Daily hours
              </label>
              <Input id="dailyAvailableHours" name="dailyAvailableHours" type="number" defaultValue={2} min={1} max={12} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="preferredLanguage">
              Preferred language
            </label>
            <Select id="preferredLanguage" name="preferredLanguage" defaultValue="C++">
              <option value="C++">C++</option>
              <option value="Java">Java</option>
              <option value="Python">Python</option>
              <option value="JavaScript">JavaScript</option>
            </Select>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Target companies</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companySeed.map((company) => (
                <label
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm"
                  key={company.slug}
                >
                  <input className="accent-[var(--primary)]" name="targetCompanies" type="checkbox" value={company.slug} />
                  {company.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Weak topics</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topicSeed.map((topic) => (
                <label
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm"
                  key={topic.slug}
                >
                  <input className="accent-[var(--primary)]" name="weakTopics" type="checkbox" value={topic.slug} />
                  {topic.name}
                </label>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {role === Role.MENTOR ? (
        <div className="grid gap-4 rounded-[28px] border border-border bg-card p-5 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="companyName">
              Company
            </label>
            <Input id="companyName" name="companyName" placeholder="Google" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="roleTitle">
              Role title
            </label>
            <Input id="roleTitle" name="roleTitle" placeholder="Software Engineer" required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="experienceYears">
              Experience (years)
            </label>
            <Input id="experienceYears" name="experienceYears" type="number" defaultValue={3} min={0} max={30} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium" htmlFor="expertiseTags">
              Expertise tags
            </label>
            <Input
              id="expertiseTags"
              name="expertiseTags"
              placeholder="Graph, Trees, Binary Search"
            />
          </div>
        </div>
      ) : null}

      {role === Role.COMPANY ? (
        <div className="rounded-[28px] border border-border bg-card p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="companyName">
              Company name
            </label>
            <Input id="companyName" name="companyName" placeholder="Acme Technologies" required />
          </div>
        </div>
      ) : null}

      {state.error ? <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{state.error}</p> : null}

      <SubmitButton className="w-full" pendingLabel="Creating your account...">
        Create account
      </SubmitButton>
    </form>
  );
}
