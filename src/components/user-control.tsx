"use client";

import { dark } from "@clerk/themes";
import { UserButton } from "@clerk/nextjs";

import { useCurrentTheme } from "@/hooks/use-current-theme";

interface Props {
  showName?: boolean;
};

const UserControl = ({ showName }: Props) => {
  const currentTheme = useCurrentTheme();

  return (
    <UserButton
      showName={showName}
      appearance={
        currentTheme === "dark"
          ? { ...dark, elements: { userButtonAvatarBox: "border!" } }
          : { elements: { userButtonAvatarBox: "border!" } }
      }
    />
  );
};

export default UserControl;
