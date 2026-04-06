"use client";

import { AlertTriangle, KeyRound, Save, Shield, Trash2, UserRoundCog } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CareerTarget,
  Role,
  StudentLevel,
  UserPortal,
  UserStatus,
} from "@/generated/prisma/enums";
import {
  removeManagedUserAction,
  resetManagedUserPasswordAction,
  setManagedUserStatusAction,
  updateManagedUserAction,
} from "@/lib/actions/user-management-actions";
import { userPortalLabels, userStatusLabels } from "@/lib/access-control";
import { roleLabels } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  slug: string;
  role: Role;
  status: UserStatus;
  accessGrants: UserPortal[];
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  passwordResetRequired: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  lastActiveAt: Date | string | null;
  studentProfile: {
    currentLevel: StudentLevel;
    target: CareerTarget;
    dailyAvailableHours: number;
    preferredLanguage: string;
    about: string | null;
    targetCompanies: Array<{ companyId: string; company: { name: string } }>;
    weakTopics: Array<{ topicId: string; topic: { name: string } }>;
  } | null;
  mentorProfile: {
    companyId: string | null;
    roleTitle: string;
    experienceYears: number;
    bio: string;
    expertiseTags: string[];
    officeHours: string | null;
  } | null;
  ownedCompany: {
    id: string;
    name: string;
    overview: string;
    industry: string | null;
    website: string | null;
  } | null;
};

type PanelProps = {
  managedUser: ManagedUser;
  viewerId: string;
  companies: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
};

function createProfileState(managedUser: ManagedUser) {
  return {
    name: managedUser.name,
    email: managedUser.email,
    slug: managedUser.slug,
    role: managedUser.role,
    status: managedUser.status,
    accessGrants: [...managedUser.accessGrants],
    headline: managedUser.headline ?? "",
    bio: managedUser.bio ?? "",
    location: managedUser.location ?? "",
    avatarUrl: managedUser.avatarUrl ?? "",
    githubUrl: managedUser.githubUrl ?? "",
    linkedinUrl: managedUser.linkedinUrl ?? "",
    portfolioUrl: managedUser.portfolioUrl ?? "",
    isVerified: managedUser.isVerified,
    isFeatured: managedUser.isFeatured,
    studentCurrentLevel: managedUser.studentProfile?.currentLevel ?? StudentLevel.BEGINNER,
    studentTarget: managedUser.studentProfile?.target ?? CareerTarget.PLACEMENT,
    studentDailyAvailableHours: String(managedUser.studentProfile?.dailyAvailableHours ?? 2),
    studentPreferredLanguage: managedUser.studentProfile?.preferredLanguage ?? "JavaScript",
    studentAbout: managedUser.studentProfile?.about ?? "",
    studentTargetCompanyIds: managedUser.studentProfile?.targetCompanies.map((company) => company.companyId) ?? [],
    studentWeakTopicIds: managedUser.studentProfile?.weakTopics.map((topic) => topic.topicId) ?? [],
    mentorCompanyId: managedUser.mentorProfile?.companyId ?? "",
    mentorRoleTitle: managedUser.mentorProfile?.roleTitle ?? "",
    mentorExperienceYears: String(managedUser.mentorProfile?.experienceYears ?? 3),
    mentorBio: managedUser.mentorProfile?.bio ?? "",
    mentorExpertiseTags: managedUser.mentorProfile?.expertiseTags.join(", ") ?? "",
    mentorOfficeHours: managedUser.mentorProfile?.officeHours ?? "",
    companyName: managedUser.ownedCompany?.name ?? "",
    companyIndustry: managedUser.ownedCompany?.industry ?? "",
    companyWebsite: managedUser.ownedCompany?.website ?? "",
    companyOverview: managedUser.ownedCompany?.overview ?? "",
  };
}

function FieldError({
  fieldErrors,
  name,
}: {
  fieldErrors: Record<string, string[] | undefined>;
  name: string;
}) {
  const message = fieldErrors[name]?.[0];

  if (!message) {
    return null;
  }

  return <p className="text-sm text-danger">{message}</p>;
}

export function AdminUserManagementPanel({
  managedUser,
  viewerId,
  companies,
  topics,
}: PanelProps) {
  const router = useRouter();
  const [profileState, setProfileState] = useState(() => createProfileState(managedUser));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [panelError, setPanelError] = useState<string | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [forcePasswordReset, setForcePasswordReset] = useState(true);
  const [passwordFieldErrors, setPasswordFieldErrors] = useState<Record<string, string[] | undefined>>(
    {},
  );
  const [isSaving, startSaveTransition] = useTransition();
  const [isLifecycleMutating, startLifecycleTransition] = useTransition();
  const [isPasswordMutating, startPasswordTransition] = useTransition();

  const isSelf = viewerId === managedUser.id;
  const isRemoved = managedUser.status === UserStatus.DELETED;

  const selectedCompanyNames = useMemo(
    () =>
      companies
        .filter((company) => profileState.studentTargetCompanyIds.includes(company.id))
        .map((company) => company.name),
    [companies, profileState.studentTargetCompanyIds],
  );

  function updateState<Key extends keyof typeof profileState>(key: Key, value: (typeof profileState)[Key]) {
    setProfileState((current) => ({ ...current, [key]: value }));
  }

  function toggleAccessGrant(grant: UserPortal) {
    updateState(
      "accessGrants",
      profileState.accessGrants.includes(grant)
        ? profileState.accessGrants.filter((item) => item !== grant)
        : [...profileState.accessGrants, grant],
    );
  }

  function toggleSelection(
    key: "studentTargetCompanyIds" | "studentWeakTopicIds",
    value: string,
  ) {
    const current = profileState[key];
    updateState(
      key,
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }

  function resetForm() {
    setProfileState(createProfileState(managedUser));
    setFieldErrors({});
    setPanelError(null);
  }

  function buildUpdateFormData() {
    const formData = new FormData();
    formData.set("userId", managedUser.id);
    formData.set("name", profileState.name);
    formData.set("email", profileState.email);
    formData.set("slug", profileState.slug);
    formData.set("role", profileState.role);
    formData.set("status", profileState.status);
    formData.set("headline", profileState.headline);
    formData.set("bio", profileState.bio);
    formData.set("location", profileState.location);
    formData.set("avatarUrl", profileState.avatarUrl);
    formData.set("githubUrl", profileState.githubUrl);
    formData.set("linkedinUrl", profileState.linkedinUrl);
    formData.set("portfolioUrl", profileState.portfolioUrl);

    if (profileState.isVerified) {
      formData.set("isVerified", "true");
    }

    if (profileState.isFeatured) {
      formData.set("isFeatured", "true");
    }

    for (const grant of profileState.accessGrants) {
      formData.append("accessGrants", grant);
    }

    if (profileState.role === Role.STUDENT) {
      formData.set("studentCurrentLevel", profileState.studentCurrentLevel);
      formData.set("studentTarget", profileState.studentTarget);
      formData.set("studentDailyAvailableHours", profileState.studentDailyAvailableHours);
      formData.set("studentPreferredLanguage", profileState.studentPreferredLanguage);
      formData.set("studentAbout", profileState.studentAbout);

      for (const companyId of profileState.studentTargetCompanyIds) {
        formData.append("studentTargetCompanyIds", companyId);
      }

      for (const topicId of profileState.studentWeakTopicIds) {
        formData.append("studentWeakTopicIds", topicId);
      }
    }

    if (profileState.role === Role.MENTOR) {
      formData.set("mentorCompanyId", profileState.mentorCompanyId);
      formData.set("mentorRoleTitle", profileState.mentorRoleTitle);
      formData.set("mentorExperienceYears", profileState.mentorExperienceYears);
      formData.set("mentorBio", profileState.mentorBio);
      formData.set("mentorExpertiseTags", profileState.mentorExpertiseTags);
      formData.set("mentorOfficeHours", profileState.mentorOfficeHours);
    }

    if (profileState.role === Role.COMPANY) {
      formData.set("companyName", profileState.companyName);
      formData.set("companyIndustry", profileState.companyIndustry);
      formData.set("companyWebsite", profileState.companyWebsite);
      formData.set("companyOverview", profileState.companyOverview);
    }

    return formData;
  }

  function handleSave() {
    setPanelError(null);
    setFieldErrors({});

    startSaveTransition(async () => {
      const result = await updateManagedUserAction(buildUpdateFormData());

      if (!result.ok) {
        setPanelError(result.error ?? "Unable to update this user right now.");
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Unable to update this user right now.");
        return;
      }

      toast.success(result.message ?? "User updated.");
      router.refresh();
    });
  }

  function handleStatus(status: UserStatus) {
    const confirmLabel =
      status === UserStatus.BLOCKED
        ? "Block this user and revoke active sessions?"
        : status === UserStatus.DEACTIVATED
          ? "Deactivate this user and stop access until reactivated?"
          : "Reactivate this user?";

    if (!window.confirm(confirmLabel)) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", managedUser.id);
    formData.set("status", status);

    startLifecycleTransition(async () => {
      const result = await setManagedUserStatusAction(formData);

      if (!result.ok) {
        toast.error(result.error ?? "Unable to update the user status.");
        return;
      }

      toast.success(result.message ?? "User status updated.");
      router.refresh();
    });
  }

  function handleRemove() {
    if (
      !window.confirm(
        "Soft-remove this account? The login will be revoked, access will be cleared, and identifying fields will be anonymized.",
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", managedUser.id);

    startLifecycleTransition(async () => {
      const result = await removeManagedUserAction(formData);

      if (!result.ok) {
        toast.error(result.error ?? "Unable to remove this user.");
        return;
      }

      toast.success(result.message ?? "User removed.");
      router.refresh();
    });
  }

  function handleResetPassword() {
    setPasswordFieldErrors({});

    const formData = new FormData();
    formData.set("userId", managedUser.id);
    formData.set("temporaryPassword", temporaryPassword);
    if (forcePasswordReset) {
      formData.set("forcePasswordReset", "true");
    }

    startPasswordTransition(async () => {
      const result = await resetManagedUserPasswordAction(formData);

      if (!result.ok) {
        setPasswordFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Unable to reset this password.");
        return;
      }

      setTemporaryPassword("");
      toast.success(result.message ?? "Temporary password saved.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <Card className="glass-panel-strong">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{roleLabels[managedUser.role]}</Badge>
                <Badge variant={managedUser.status === UserStatus.ACTIVE ? "success" : "outline"}>
                  {userStatusLabels[managedUser.status]}
                </Badge>
                {managedUser.passwordResetRequired ? <Badge variant="outline">Reset required</Badge> : null}
                {isSelf ? <Badge variant="outline">Your account</Badge> : null}
              </div>
              <CardTitle>{managedUser.name}</CardTitle>
              <CardDescription>{managedUser.email}</CardDescription>
            </div>
            <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
              <p>Created {formatDate(managedUser.createdAt, "dd MMM yyyy")}</p>
              <p>
                Last active{" "}
                {managedUser.lastActiveAt
                  ? formatDate(managedUser.lastActiveAt, "dd MMM yyyy")
                  : "No recent activity"}
              </p>
            </div>
          </div>

          {isRemoved ? (
            <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
              This account has already been removed. The record stays visible for audit-safe review, but it can no longer be edited.
            </div>
          ) : null}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRoundCog className="size-4" />
            Account and profile details
          </CardTitle>
          <CardDescription>
            Update identity, profile copy, role-specific details, and user-facing metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-name">
                Full name
              </label>
              <Input id="managed-name" onChange={(event) => updateState("name", event.target.value)} value={profileState.name} />
              <FieldError fieldErrors={fieldErrors} name="name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-email">
                Email
              </label>
              <Input id="managed-email" onChange={(event) => updateState("email", event.target.value)} type="email" value={profileState.email} />
              <FieldError fieldErrors={fieldErrors} name="email" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-slug">
                Profile handle
              </label>
              <Input id="managed-slug" onChange={(event) => updateState("slug", event.target.value)} value={profileState.slug} />
              <FieldError fieldErrors={fieldErrors} name="slug" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-location">
                Location
              </label>
              <Input id="managed-location" onChange={(event) => updateState("location", event.target.value)} value={profileState.location} />
              <FieldError fieldErrors={fieldErrors} name="location" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-headline">
                Headline
              </label>
              <Input id="managed-headline" onChange={(event) => updateState("headline", event.target.value)} value={profileState.headline} />
              <FieldError fieldErrors={fieldErrors} name="headline" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-avatar">
                Avatar URL
              </label>
              <Input id="managed-avatar" onChange={(event) => updateState("avatarUrl", event.target.value)} value={profileState.avatarUrl} />
              <FieldError fieldErrors={fieldErrors} name="avatarUrl" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="managed-bio">
              Bio / description
            </label>
            <Textarea id="managed-bio" onChange={(event) => updateState("bio", event.target.value)} value={profileState.bio} />
            <FieldError fieldErrors={fieldErrors} name="bio" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-github">
                GitHub URL
              </label>
              <Input id="managed-github" onChange={(event) => updateState("githubUrl", event.target.value)} value={profileState.githubUrl} />
              <FieldError fieldErrors={fieldErrors} name="githubUrl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-linkedin">
                LinkedIn URL
              </label>
              <Input id="managed-linkedin" onChange={(event) => updateState("linkedinUrl", event.target.value)} value={profileState.linkedinUrl} />
              <FieldError fieldErrors={fieldErrors} name="linkedinUrl" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-portfolio">
                Portfolio URL
              </label>
              <Input id="managed-portfolio" onChange={(event) => updateState("portfolioUrl", event.target.value)} value={profileState.portfolioUrl} />
              <FieldError fieldErrors={fieldErrors} name="portfolioUrl" />
            </div>
          </div>

          <div className="grid gap-4 rounded-[24px] border border-border bg-background/40 p-4 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-role">
                Role
              </label>
              <Select disabled={isRemoved || isSelf} id="managed-role" onChange={(event) => updateState("role", event.target.value as Role)} value={profileState.role}>
                {Object.values(Role).map((role) => (
                  <option key={role} value={role}>
                    {roleLabels[role]}
                  </option>
                ))}
              </Select>
              {isSelf ? (
                <p className="text-xs text-muted">
                  Use your own profile page for personal edits. Protected access changes stay disabled here.
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="managed-status">
                Status
              </label>
              <Select disabled={isRemoved || isSelf} id="managed-status" onChange={(event) => updateState("status", event.target.value as UserStatus)} value={profileState.status}>
                {Object.values(UserStatus).map((status) => (
                  <option key={status} value={status}>
                    {userStatusLabels[status]}
                  </option>
                ))}
              </Select>
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <input checked={profileState.isVerified} className="accent-[var(--primary)]" onChange={(event) => updateState("isVerified", event.target.checked)} type="checkbox" />
              Verified profile
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm">
              <input checked={profileState.isFeatured} className="accent-[var(--primary)]" onChange={(event) => updateState("isFeatured", event.target.checked)} type="checkbox" />
              Featured account
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="size-4" />
              <p className="text-sm font-semibold">Portal access</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Object.values(UserPortal).map((grant) => (
                <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm" key={grant}>
                  <input checked={profileState.accessGrants.includes(grant)} className="accent-[var(--primary)]" disabled={isRemoved || isSelf} onChange={() => toggleAccessGrant(grant)} type="checkbox" />
                  {userPortalLabels[grant]}
                </label>
              ))}
            </div>
            <FieldError fieldErrors={fieldErrors} name="accessGrants" />
          </div>

          {profileState.role === Role.STUDENT ? (
            <div className="space-y-5 rounded-[24px] border border-border bg-background/40 p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="student-level">
                    Current level
                  </label>
                  <Select id="student-level" onChange={(event) => updateState("studentCurrentLevel", event.target.value as StudentLevel)} value={profileState.studentCurrentLevel}>
                    {Object.values(StudentLevel).map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </Select>
                  <FieldError fieldErrors={fieldErrors} name="studentCurrentLevel" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="student-target">
                    Target
                  </label>
                  <Select id="student-target" onChange={(event) => updateState("studentTarget", event.target.value as CareerTarget)} value={profileState.studentTarget}>
                    {Object.values(CareerTarget).map((target) => (
                      <option key={target} value={target}>
                        {target}
                      </option>
                    ))}
                  </Select>
                  <FieldError fieldErrors={fieldErrors} name="studentTarget" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="student-hours">
                    Daily available hours
                  </label>
                  <Input id="student-hours" min={1} max={12} onChange={(event) => updateState("studentDailyAvailableHours", event.target.value)} type="number" value={profileState.studentDailyAvailableHours} />
                  <FieldError fieldErrors={fieldErrors} name="studentDailyAvailableHours" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="student-language">
                    Preferred language
                  </label>
                  <Input id="student-language" onChange={(event) => updateState("studentPreferredLanguage", event.target.value)} value={profileState.studentPreferredLanguage} />
                  <FieldError fieldErrors={fieldErrors} name="studentPreferredLanguage" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="student-about">
                  About / study summary
                </label>
                <Textarea id="student-about" onChange={(event) => updateState("studentAbout", event.target.value)} value={profileState.studentAbout} />
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Target companies</p>
                  <div className="grid gap-3">
                    {companies.map((company) => (
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm" key={company.id}>
                        <input checked={profileState.studentTargetCompanyIds.includes(company.id)} className="accent-[var(--primary)]" onChange={() => toggleSelection("studentTargetCompanyIds", company.id)} type="checkbox" />
                        {company.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">Weak topics</p>
                  <div className="grid gap-3">
                    {topics.map((topic) => (
                      <label className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm" key={topic.id}>
                        <input checked={profileState.studentWeakTopicIds.includes(topic.id)} className="accent-[var(--primary)]" onChange={() => toggleSelection("studentWeakTopicIds", topic.id)} type="checkbox" />
                        {topic.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {selectedCompanyNames.length ? (
                <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted">
                  Current targets: {selectedCompanyNames.join(", ")}
                </div>
              ) : null}
            </div>
          ) : null}

          {profileState.role === Role.MENTOR ? (
            <div className="space-y-5 rounded-[24px] border border-border bg-background/40 p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="mentor-company">
                    Company
                  </label>
                  <Select id="mentor-company" onChange={(event) => updateState("mentorCompanyId", event.target.value)} value={profileState.mentorCompanyId}>
                    <option value="">Independent mentor</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="mentor-role-title">
                    Role title
                  </label>
                  <Input id="mentor-role-title" onChange={(event) => updateState("mentorRoleTitle", event.target.value)} value={profileState.mentorRoleTitle} />
                  <FieldError fieldErrors={fieldErrors} name="mentorRoleTitle" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="mentor-experience">
                    Experience (years)
                  </label>
                  <Input id="mentor-experience" min={0} max={40} onChange={(event) => updateState("mentorExperienceYears", event.target.value)} type="number" value={profileState.mentorExperienceYears} />
                  <FieldError fieldErrors={fieldErrors} name="mentorExperienceYears" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="mentor-hours">
                    Office hours
                  </label>
                  <Input id="mentor-hours" onChange={(event) => updateState("mentorOfficeHours", event.target.value)} value={profileState.mentorOfficeHours} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="mentor-tags">
                  Expertise tags
                </label>
                <Input id="mentor-tags" onChange={(event) => updateState("mentorExpertiseTags", event.target.value)} value={profileState.mentorExpertiseTags} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="mentor-bio">
                  Mentor bio
                </label>
                <Textarea id="mentor-bio" onChange={(event) => updateState("mentorBio", event.target.value)} value={profileState.mentorBio} />
                <FieldError fieldErrors={fieldErrors} name="mentorBio" />
              </div>
            </div>
          ) : null}

          {profileState.role === Role.COMPANY ? (
            <div className="space-y-5 rounded-[24px] border border-border bg-background/40 p-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="company-name">
                    Company name
                  </label>
                  <Input id="company-name" onChange={(event) => updateState("companyName", event.target.value)} value={profileState.companyName} />
                  <FieldError fieldErrors={fieldErrors} name="companyName" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="company-industry">
                    Industry
                  </label>
                  <Input id="company-industry" onChange={(event) => updateState("companyIndustry", event.target.value)} value={profileState.companyIndustry} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="company-website">
                    Website
                  </label>
                  <Input id="company-website" onChange={(event) => updateState("companyWebsite", event.target.value)} value={profileState.companyWebsite} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="company-overview">
                  Company overview
                </label>
                <Textarea id="company-overview" onChange={(event) => updateState("companyOverview", event.target.value)} value={profileState.companyOverview} />
              </div>
            </div>
          ) : null}

          {panelError ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {panelError}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button disabled={isSaving || isRemoved} onClick={handleSave} type="button">
              <Save className="size-4" />
              {isSaving ? "Saving..." : "Save user changes"}
            </Button>
            <Button disabled={isSaving} onClick={resetForm} type="button" variant="outline">
              Reset changes
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Reset password
            </CardTitle>
            <CardDescription>
              Set a temporary password and optionally force the user to change it on the next sign-in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="temporary-password">
                Temporary password
              </label>
              <Input disabled={isSelf || isRemoved} id="temporary-password" onChange={(event) => setTemporaryPassword(event.target.value)} type="password" value={temporaryPassword} />
              <FieldError fieldErrors={passwordFieldErrors} name="temporaryPassword" />
            </div>
            <label className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm">
              <input checked={forcePasswordReset} className="accent-[var(--primary)]" onChange={(event) => setForcePasswordReset(event.target.checked)} type="checkbox" />
              Force password reset on next login
            </label>
            <Button disabled={isPasswordMutating || isSelf || isRemoved || temporaryPassword.length === 0} onClick={handleResetPassword} type="button" variant="secondary">
              {isPasswordMutating ? "Saving password..." : "Save temporary password"}
            </Button>
            {isSelf ? <p className="text-xs text-muted">For your own password, use the profile settings page.</p> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4" />
              Lifecycle controls
            </CardTitle>
            <CardDescription>
              These actions revoke access and invalidate live sessions immediately.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button disabled={isLifecycleMutating || isRemoved || isSelf} onClick={() => handleStatus(UserStatus.BLOCKED)} type="button" variant="outline">
                Block user
              </Button>
              <Button disabled={isLifecycleMutating || isRemoved} onClick={() => handleStatus(UserStatus.ACTIVE)} type="button" variant="secondary">
                Unblock / reactivate
              </Button>
              <Button disabled={isLifecycleMutating || isRemoved || isSelf} onClick={() => handleStatus(UserStatus.DEACTIVATED)} type="button" variant="outline">
                Deactivate
              </Button>
              <Button disabled={isLifecycleMutating || isRemoved || isSelf} onClick={handleRemove} type="button" variant="danger">
                <Trash2 className="size-4" />
                Remove account
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-background/50 px-4 py-3 text-sm text-muted">
              Removed accounts are soft-deleted: access is cleared, identifying fields are anonymized, and the record remains available for audit-safe review.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
