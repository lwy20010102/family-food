"use client";

import { useEffect, useState } from "react";

import { DownloadIcon } from "@/components/icons";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsStandalone(standalone);
    setIsIos(ios);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isStandalone || (!installPrompt && !isIos)) {
    return null;
  }

  async function handleInstall() {
    if (!installPrompt) {
      setShowIosHint((current) => !current);
      return;
    }

    setInstalling(true);
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="workspace-install-wrap">
      <button
        type="button"
        className="button-secondary button-sm workspace-install-button"
        onClick={() => void handleInstall()}
        disabled={installing}
      >
        <DownloadIcon className="mr-2 h-4 w-4" />
        {installing ? "准备中..." : "安装到手机"}
      </button>
      {showIosHint ? (
        <p className="workspace-install-hint" role="status">
          在浏览器底部点“分享”，再选择“添加到主屏幕”。
        </p>
      ) : null}
    </div>
  );
}
