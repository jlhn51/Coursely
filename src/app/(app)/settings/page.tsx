import { currentUser } from "@clerk/nextjs/server";
import { Reveal } from "@/components/reveal";
import { SettingsSections } from "./settings-sections";

export default async function SettingsPage() {
  const user = await currentUser();
  const preferredName =
    typeof user?.unsafeMetadata?.preferredName === "string"
      ? user.unsafeMetadata.preferredName.trim()
      : "";
  const clerkFirstName = user?.firstName?.trim() ?? "";
  const profile = {
    name:
      user?.fullName?.trim() ||
      user?.firstName?.trim() ||
      "You",
    email: user?.primaryEmailAddress?.emailAddress ?? null,
    imageUrl: user?.imageUrl ?? null,
    initials: initialsFrom(user?.fullName ?? user?.firstName ?? "You"),
    preferredName,
    clerkFirstName,
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 pt-12 pb-24 md:pt-16 md:pb-32">
      <Reveal as="section">
        <h1 className="font-serif text-[36px] leading-[1.05] text-ink md:text-[52px]">
          Your <em className="italic text-accent">preferences.</em>
        </h1>
        <p className="mt-3 max-w-xl text-[15.5px] leading-[1.55] text-muted md:text-[17px]">
          Theme, account, danger zone.
        </p>
      </Reveal>

      <Reveal as="section" className="mt-10 md:mt-14">
        <SettingsSections profile={profile} />
      </Reveal>
    </div>
  );
}

function initialsFrom(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
