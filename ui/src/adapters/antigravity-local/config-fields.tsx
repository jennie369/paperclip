import type { AdapterConfigFieldsProps } from "../types";
import {
  DraftInput,
  Field,
} from "../../components/agent-config-primitives";
import { ChoosePathButton } from "../../components/PathInstructionsModal";

const inputClass =
  "w-full rounded-md border border-border px-2.5 py-1.5 bg-transparent outline-none text-sm font-mono placeholder:text-muted-foreground/40";
const instructionsFileHint =
  "Absolute path to a markdown file (e.g. AGENTS.md) that defines this agent's behavior. Its folder is granted via --add-dir and agy reads it via the run prompt's file pointer.";
const conversationIdHint =
  "agy không tạo brain headless — mồi 1 lần bằng `agy --conversation <id>` (interactive) rồi /exit, sau đó dán id vào đây. Để trống = adapter tạo brain mới mỗi heartbeat (chỉ dùng được nếu brain đã tồn tại).";

export function AntigravityLocalConfigFields({
  isCreate,
  values,
  set,
  config,
  eff,
  mark,
  hideInstructionsFile,
}: AdapterConfigFieldsProps) {
  return (
    <>
      {!hideInstructionsFile && (
        <Field label="Agent instructions file" hint={instructionsFileHint}>
          <div className="flex items-center gap-2">
            <DraftInput
              value={
                isCreate
                  ? values!.instructionsFilePath ?? ""
                  : eff(
                      "adapterConfig",
                      "instructionsFilePath",
                      String(config.instructionsFilePath ?? ""),
                    )
              }
              onCommit={(v) =>
                isCreate
                  ? set!({ instructionsFilePath: v })
                  : mark("adapterConfig", "instructionsFilePath", v || undefined)
              }
              immediate
              className={inputClass}
              placeholder="/absolute/path/to/AGENTS.md"
            />
            <ChoosePathButton />
          </div>
        </Field>
      )}
      <Field label="Antigravity brain ID (conversation_id)" hint={conversationIdHint}>
        <DraftInput
          value={
            isCreate
              ? values!.conversationId ?? ""
              : eff(
                  "adapterConfig",
                  "conversationId",
                  String(config.conversationId ?? ""),
                )
          }
          onCommit={(v) =>
            isCreate
              ? set!({ conversationId: v })
              : mark("adapterConfig", "conversationId", v || undefined)
          }
          immediate
          className={inputClass}
          placeholder="vd: 18dbe41e-5838-44e6-9fcc-57fba1bc573f"
        />
      </Field>
    </>
  );
}
