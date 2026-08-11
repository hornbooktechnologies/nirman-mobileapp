"use client";

import { FormEvent, useState } from "react";
import {
  Button,
  Card,
  Input,
  PageHeader,
  SectionHeader,
} from "@/components/ui";
import {
  useChangePassword,
  useProfile,
  useUpdateProfile,
} from "@/features/profile/hooks/use-profile";
import type { Profile } from "@/features/profile/types/profile.types";

export function ProfilePage() {
  const profile = useProfile();

  return (
    <div className="space-y-4">
      <PageHeader title="Profile" description="Manage your account details." />

      {profile.isLoading ? (
        <Card><p className="text-[13px] text-body">Loading profile</p></Card>
      ) : profile.isError ? (
        <Card><p className="text-[13px] text-red-600">Unable to load profile</p></Card>
      ) : profile.data ? (
        <ProfileEditor
          key={`${profile.data.id}:${profile.data.name}:${profile.data.phone ?? ""}`}
          profile={profile.data}
        />
      ) : null}
    </div>
  );
}

function ProfileEditor({ profile }: { profile: Profile }) {
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [password, setPassword] = useState("");

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile.mutate({ name, phone: phone || null });
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changePassword.mutate(
      { password },
      { onSuccess: () => setPassword("") },
    );
  }

  return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="h-full">
            <form
              className="flex h-full flex-col"
              onSubmit={handleProfileSubmit}
            >
              <SectionHeader
                title="Personal information"
                description="Update the name and phone number shown on your account."
              />
              <div className="mt-5 space-y-4">
                <label className="space-y-1.5">
                  <span className="text-[12px] font-medium text-sub">Name</span>
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[12px] font-medium text-sub">Phone</span>
                  <Input value={phone} onChange={(event) => setPhone(event.target.value)} />
                </label>
              </div>
              <div className="mt-6 flex justify-end border-t border-hairline/60 pt-4 lg:mt-auto">
                <Button
                  className="w-full sm:w-auto sm:min-w-[148px]"
                  type="submit"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? "Saving" : "Save Profile"}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="h-full">
            <div className="flex h-full flex-col">
              <SectionHeader
                title="Account & security"
                description="Review your account access and update your password."
              />
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-[12px] font-medium text-sub">Email</p>
                  <p className="break-words text-[14px] text-body">{profile.email}</p>
                </div>
                <div>
                  <p className="text-[12px] font-medium text-sub">Role</p>
                  <p className="text-[14px] text-body">{profile.role.name}</p>
                </div>
              </div>
              <form
                className="mt-6 flex flex-1 flex-col"
                onSubmit={handlePasswordSubmit}
              >
                <label className="space-y-1.5 mb-3">
                  <span className="text-[12px] font-medium text-sub">New password</span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    minLength={8}
                  />
                </label>
                <div className="mt-6 flex justify-end border-t border-hairline/60 pt-4 lg:mt-auto">
                  <Button
                    className="w-full sm:w-auto sm:min-w-[148px]"
                    type="submit"
                    disabled={changePassword.isPending || password.length < 8}
                  >
                    {changePassword.isPending ? "Updating" : "Change Password"}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
  );
}
