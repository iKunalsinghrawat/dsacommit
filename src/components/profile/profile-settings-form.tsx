"use client";

import { LockKeyhole, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  CareerTarget,
  ProfileVisibility,
  Role,
  StudentLevel,
} from "@/generated/prisma/enums";
import {
  updateOwnPasswordAction,
  updateOwnProfileAction,
} from "@/lib/actions/user-management-actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type ProfileData = {
  id: string;
  role: Role;
  email: string;
  name: string;
  slug: string;
  profileVisibility: ProfileVisibility;
  headline: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  passwordResetRequired: boolean;
  studentProfile: {
    currentLevel: StudentLevel;
    target: CareerTarget;
    dailyAvailableHours: number;
    preferredLanguage: string;
    about: string | null;
    targetCompanies: Array<{ companyId: string }>;
    weakTopics: Array<{ topicId: string }>;
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
    name: string;
    industry: string | null;
    website: string | null;
    overview: string;
  } | null;
};

function FieldError({
  fieldErrors,
  name,
}: {
  fieldErrors: Record<string, string[] | undefined>;
  name: string;
}) {
  const message = fieldErrors[name]?.[0];
  return message ? <p className="text-sm text-danger">{message}</p> : null;
}

export function ProfileSettingsForm({
  profile,
  companies,
  topics,
}: {
  profile: ProfileData;
  companies: Array<{ id: string; name: string }>;
  topics: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({});
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string[] | undefined>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [profileState, setProfileState] = useState({
    name: profile.name,
    slug: profile.slug,
    profileVisibility: profile.profileVisibility,
    headline: profile.headline ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    avatarUrl: profile.avatarUrl ?? "",
    githubUrl: profile.githubUrl ?? "",
    linkedinUrl: profile.linkedinUrl ?? "",
    portfolioUrl: profile.portfolioUrl ?? "",
    studentCurrentLevel: profile.studentProfile?.currentLevel ?? StudentLevel.BEGINNER,
    studentTarget: profile.studentProfile?.target ?? CareerTarget.PLACEMENT,
    studentDailyAvailableHours: String(profile.studentProfile?.dailyAvailableHours ?? 2),
    studentPreferredLanguage: profile.studentProfile?.preferredLanguage ?? "JavaScript",
    studentAbout: profile.studentProfile?.about ?? "",
    studentTargetCompanyIds: profile.studentProfile?.targetCompanies.map((company) => company.companyId) ?? [],
    studentWeakTopicIds: profile.studentProfile?.weakTopics.map((topic) => topic.topicId) ?? [],
    mentorCompanyId: profile.mentorProfile?.companyId ?? "",
    mentorRoleTitle: profile.mentorProfile?.roleTitle ?? "",
    mentorExperienceYears: String(profile.mentorProfile?.experienceYears ?? 3),
    mentorBio: profile.mentorProfile?.bio ?? "",
    mentorExpertiseTags: profile.mentorProfile?.expertiseTags.join(", ") ?? "",
    mentorOfficeHours: profile.mentorProfile?.officeHours ?? "",
    companyName: profile.ownedCompany?.name ?? "",
    companyIndustry: profile.ownedCompany?.industry ?? "",
    companyWebsite: profile.ownedCompany?.website ?? "",
    companyOverview: profile.ownedCompany?.overview ?? "",
  });
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSaving, startSaveTransition] = useTransition();
  const [isSavingPassword, startPasswordTransition] = useTransition();

  const passwordResetRequired =
    searchParams.get("passwordReset") === "required" || profile.passwordResetRequired;
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

  function buildProfileFormData() {
    const formData = new FormData();
    formData.set("name", profileState.name);
    formData.set("slug", profileState.slug);
    formData.set("profileVisibility", profileState.profileVisibility);
    formData.set("headline", profileState.headline);
    formData.set("bio", profileState.bio);
    formData.set("location", profileState.location);
    formData.set("avatarUrl", profileState.avatarUrl);
    formData.set("githubUrl", profileState.githubUrl);
    formData.set("linkedinUrl", profileState.linkedinUrl);
    formData.set("portfolioUrl", profileState.portfolioUrl);

    if (profile.role === Role.STUDENT) {
      formData.set("studentCurrentLevel", profileState.studentCurrentLevel);
      formData.set("studentTarget", profileState.studentTarget);
      formData.set("studentDailyAvailableHours", profileState.studentDailyAvailableHours);
      formData.set("studentPreferredLanguage", profileState.studentPreferredLanguage);
      formData.set("studentAbout", profileState.studentAbout);
      for (const companyId of profileState.studentTargetCompanyIds) formData.append("studentTargetCompanyIds", companyId);
      for (const topicId of profileState.studentWeakTopicIds) formData.append("studentWeakTopicIds", topicId);
    }

    if (profile.role === Role.MENTOR) {
      formData.set("mentorCompanyId", profileState.mentorCompanyId);
      formData.set("mentorRoleTitle", profileState.mentorRoleTitle);
      formData.set("mentorExperienceYears", profileState.mentorExperienceYears);
      formData.set("mentorBio", profileState.mentorBio);
      formData.set("mentorExpertiseTags", profileState.mentorExpertiseTags);
      formData.set("mentorOfficeHours", profileState.mentorOfficeHours);
    }

    if (profile.role === Role.COMPANY) {
      formData.set("companyName", profileState.companyName);
      formData.set("companyIndustry", profileState.companyIndustry);
      formData.set("companyWebsite", profileState.companyWebsite);
      formData.set("companyOverview", profileState.companyOverview);
    }

    return formData;
  }

  function handleSaveProfile() {
    setFieldErrors({});
    setFormError(null);

    startSaveTransition(async () => {
      const result = await updateOwnProfileAction(buildProfileFormData());

      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setFormError(result.error ?? "Unable to save your profile.");
        toast.error(result.error ?? "Unable to save your profile.");
        return;
      }

      toast.success(result.message ?? "Profile updated.");
      router.refresh();
    });
  }

  function handleSavePassword() {
    setPasswordErrors({});

    const formData = new FormData();
    formData.set("currentPassword", passwordState.currentPassword);
    formData.set("newPassword", passwordState.newPassword);
    formData.set("confirmPassword", passwordState.confirmPassword);

    startPasswordTransition(async () => {
      const result = await updateOwnPasswordAction(formData);

      if (!result.ok) {
        setPasswordErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Unable to update your password.");
        return;
      }

      setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success(result.message ?? "Password updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {passwordResetRequired ? (
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle>Password reset required</CardTitle>
            <CardDescription>
              An admin marked your account for a password reset. Update your password before continuing with the rest of the platform.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="glass-panel-strong">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Edit your profile</CardTitle>
              <CardDescription>{profile.email}</CardDescription>
            </div>
            <Badge variant="secondary">{profile.role}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full name</label>
              <Input onChange={(event) => updateState("name", event.target.value)} value={profileState.name} />
              <FieldError fieldErrors={fieldErrors} name="name" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile handle</label>
              <Input onChange={(event) => updateState("slug", event.target.value)} value={profileState.slug} />
              <FieldError fieldErrors={fieldErrors} name="slug" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Headline</label>
              <Input onChange={(event) => updateState("headline", event.target.value)} value={profileState.headline} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input onChange={(event) => updateState("location", event.target.value)} value={profileState.location} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile privacy</label>
              <Select
                onChange={(event) =>
                  updateState("profileVisibility", event.target.value as ProfileVisibility)
                }
                value={profileState.profileVisibility}
              >
                <option value={ProfileVisibility.PUBLIC}>Public profile</option>
                <option value={ProfileVisibility.PRIVATE}>Private profile</option>
              </Select>
              <p className="text-xs leading-6 text-muted">
                Public profiles can be viewed by other signed-in users. Private profiles only stay visible to you and admins.
              </p>
              <FieldError fieldErrors={fieldErrors} name="profileVisibility" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio / description</label>
            <Textarea onChange={(event) => updateState("bio", event.target.value)} value={profileState.bio} />
            <FieldError fieldErrors={fieldErrors} name="bio" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Avatar URL</label>
              <Input onChange={(event) => updateState("avatarUrl", event.target.value)} value={profileState.avatarUrl} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GitHub</label>
              <Input onChange={(event) => updateState("githubUrl", event.target.value)} value={profileState.githubUrl} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">LinkedIn</label>
              <Input onChange={(event) => updateState("linkedinUrl", event.target.value)} value={profileState.linkedinUrl} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Portfolio</label>
              <Input onChange={(event) => updateState("portfolioUrl", event.target.value)} value={profileState.portfolioUrl} />
            </div>
          </div>

          {profile.role === Role.STUDENT ? (
            <div className="space-y-5 rounded-[24px] border border-border bg-background/40 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current level</label>
                  <Select onChange={(event) => updateState("studentCurrentLevel", event.target.value as StudentLevel)} value={profileState.studentCurrentLevel}>
                    {Object.values(StudentLevel).map((level) => <option key={level} value={level}>{level}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Target</label>
                  <Select onChange={(event) => updateState("studentTarget", event.target.value as CareerTarget)} value={profileState.studentTarget}>
                    {Object.values(CareerTarget).map((target) => <option key={target} value={target}>{target}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Daily hours</label>
                  <Input min={1} max={12} onChange={(event) => updateState("studentDailyAvailableHours", event.target.value)} type="number" value={profileState.studentDailyAvailableHours} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preferred language</label>
                  <Input onChange={(event) => updateState("studentPreferredLanguage", event.target.value)} value={profileState.studentPreferredLanguage} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">About your prep</label>
                <Textarea onChange={(event) => updateState("studentAbout", event.target.value)} value={profileState.studentAbout} />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-sm font-medium">Target companies</p>
                  <div className="grid max-h-64 gap-3 overflow-y-auto pr-1">
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
                  <div className="grid max-h-64 gap-3 overflow-y-auto pr-1">
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

          {profile.role === Role.MENTOR ? (
            <div className="space-y-4 rounded-[24px] border border-border bg-background/40 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company</label>
                  <Select onChange={(event) => updateState("mentorCompanyId", event.target.value)} value={profileState.mentorCompanyId}>
                    <option value="">Independent mentor</option>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role title</label>
                  <Input onChange={(event) => updateState("mentorRoleTitle", event.target.value)} value={profileState.mentorRoleTitle} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Experience</label>
                  <Input min={0} max={40} onChange={(event) => updateState("mentorExperienceYears", event.target.value)} type="number" value={profileState.mentorExperienceYears} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Office hours</label>
                  <Input onChange={(event) => updateState("mentorOfficeHours", event.target.value)} value={profileState.mentorOfficeHours} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Expertise tags</label>
                <Input onChange={(event) => updateState("mentorExpertiseTags", event.target.value)} value={profileState.mentorExpertiseTags} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Mentor bio</label>
                <Textarea onChange={(event) => updateState("mentorBio", event.target.value)} value={profileState.mentorBio} />
              </div>
            </div>
          ) : null}

          {profile.role === Role.COMPANY ? (
            <div className="space-y-4 rounded-[24px] border border-border bg-background/40 p-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company name</label>
                  <Input onChange={(event) => updateState("companyName", event.target.value)} value={profileState.companyName} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Industry</label>
                  <Input onChange={(event) => updateState("companyIndustry", event.target.value)} value={profileState.companyIndustry} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input onChange={(event) => updateState("companyWebsite", event.target.value)} value={profileState.companyWebsite} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Company overview</label>
                <Textarea onChange={(event) => updateState("companyOverview", event.target.value)} value={profileState.companyOverview} />
              </div>
            </div>
          ) : null}

          {formError ? (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              {formError}
            </div>
          ) : null}

          <Button className="w-full sm:w-auto" disabled={isSaving} onClick={handleSaveProfile} type="button">
            <Save className="size-4" />
            {isSaving ? "Saving..." : "Save profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockKeyhole className="size-4" />
            Password and security
          </CardTitle>
          <CardDescription>
            Change your password here. Active sessions refresh automatically after a successful update.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current password</label>
              <Input onChange={(event) => setPasswordState((current) => ({ ...current, currentPassword: event.target.value }))} type="password" value={passwordState.currentPassword} />
              <FieldError fieldErrors={passwordErrors} name="currentPassword" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input onChange={(event) => setPasswordState((current) => ({ ...current, newPassword: event.target.value }))} type="password" value={passwordState.newPassword} />
              <FieldError fieldErrors={passwordErrors} name="newPassword" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm password</label>
              <Input onChange={(event) => setPasswordState((current) => ({ ...current, confirmPassword: event.target.value }))} type="password" value={passwordState.confirmPassword} />
              <FieldError fieldErrors={passwordErrors} name="confirmPassword" />
            </div>
          </div>
          <Button className="w-full sm:w-auto" disabled={isSavingPassword} onClick={handleSavePassword} type="button" variant="secondary">
            {isSavingPassword ? "Updating password..." : "Update password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
