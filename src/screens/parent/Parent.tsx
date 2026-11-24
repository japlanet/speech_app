import { useEffect } from "preact/hooks";
import { missing } from "../../store/store.ts";
import { go, parentTab, type ParentTab } from "../../ui/nav.ts";
import { inSafariTab } from "../Pin.tsx";
import { Backup } from "./Backup.tsx";
import { History } from "./History.tsx";
import { RecordDialogHost } from "./RecordDialog.tsx";
import { Recordings } from "./Recordings.tsx";
import { SettingsTab } from "./SettingsTab.tsx";
import { Wheels } from "./Wheels.tsx";
import { Words } from "./Words.tsx";

const TABS: [ParentTab, string][] = [["recordings", "Recordings"], ["words", "Words"], ["wheels", "Wheels"], ["settings", "Settings"], ["history", "History"], ["backup", "Backup"]];

export function Parent() {
  // Lock again if the iPad is put down for a while.
  useEffect(() => {
    let left = 0;
    const onHide = () => {
      if (document.hidden) left = Date.now();
      else if (left && Date.now() - left > 5 * 60_000) go("home");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);
  const tab = parentTab.value;
  return (
    <main class="parent">
      <header class="parent-head">
        <nav class="tabs">
          {TABS.map(([id, label]) => (
            <button key={id} class={id === tab ? "on" : ""} aria-current={id === tab ? "page" : undefined} onClick={() => (parentTab.value = id)}>
              {label}{id === "recordings" && missing.value.length > 0 && <em>{missing.value.length}</em>}
            </button>
          ))}
        </nav>
        <button class="btn primary" onClick={() => go("home")}>Done</button>
      </header>
      <div class="parent-body scrolls" key={tab}>
        {inSafariTab && <p class="warn banner">You are in a Safari tab. Recordings made here will not appear in the Home Screen app. Add the app to the Home Screen and open it from there.</p>}
        {tab === "recordings" && <Recordings />}
        {tab === "words" && <Words />}
        {tab === "wheels" && <Wheels />}
        {tab === "settings" && <SettingsTab />}
        {tab === "history" && <History />}
        {tab === "backup" && <Backup />}
      </div>
      <RecordDialogHost />
    </main>
  );
}
