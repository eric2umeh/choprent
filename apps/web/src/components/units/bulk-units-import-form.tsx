"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  importUnitsFromCsv,
  previewUnitsImport,
  type UnitImportActionState,
} from "@/lib/actions/unit-import";
import type { ParsedImportUnit } from "@/lib/import/units-csv";
import { FormPanel } from "@/components/ui/form-panel";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "@/components/ui/toast";
import { formatNaira } from "@/lib/auth/roles";

const initial: UnitImportActionState = {};

export function BulkUnitsImportForm({
  orgSlug,
  propertyId,
  propertyName,
  onSaved,
}: {
  orgSlug: string;
  propertyId: string;
  propertyName: string;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<ParsedImportUnit[]>([]);
  const [previewing, setPreviewing] = useState(false);
  const [state, formAction, pending] = useActionState(
    importUnitsFromCsv.bind(null, orgSlug),
    initial
  );
  const lastError = useRef<string | undefined>(undefined);
  const lastSuccess = useRef(false);

  async function handleFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setPreviewing(true);
    const result = await previewUnitsImport(orgSlug, text);
    setPreviewing(false);
    if (result.error) toast.error(result.error);
    else setPreview(result.preview ?? []);
  }

  useEffect(() => {
    if (state.error && state.error !== lastError.current) {
      toast.error(state.error);
      lastError.current = state.error;
    }
    if (state.success && !lastSuccess.current) {
      lastSuccess.current = true;
      toast.success(
        `Imported ${state.created ?? 0} units${state.skipped ? ` (${state.skipped} skipped)` : ""}.`
      );
      router.refresh();
      onSaved?.();
    }
  }, [state.error, state.success, state.created, state.skipped, onSaved, router]);

  return (
    <FormPanel>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="site_id" value={propertyId} />

        <p className="text-sm text-muted">
          Import units into <strong>{propertyName}</strong>. Save your Excel file
          as CSV, or paste rows copied from the plaza sheet.
        </p>

        <div>
          <label className="text-label normal-case">Upload CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            className="mt-1.5 block w-full text-sm"
            disabled={pending}
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
        </div>

        <div>
          <label className="text-label normal-case">Or paste data</label>
          <textarea
            name="csv_text"
            rows={8}
            className="input-field mt-1.5 font-mono text-xs"
            placeholder={`unit_code,tenant_name,annual_rent\n203,Phytoscience Business Services Ltd,125000\n204,Phytoscience Business Services Ltd,125000`}
            value={csvText}
            disabled={pending}
            onChange={async (e) => {
              const next = e.target.value;
              setCsvText(next);
              if (next.trim().length < 20) {
                setPreview([]);
                return;
              }
              setPreviewing(true);
              const result = await previewUnitsImport(orgSlug, next);
              setPreviewing(false);
              setPreview(result.preview ?? []);
            }}
          />
          <p className="mt-1 text-form-hint">
            Plaza sheets with columns like shop no., tenant, and rent are detected
            automatically.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="create_leases" defaultChecked disabled={pending} />
          Create tenant leases when tenant names are present
        </label>

        {previewing && <p className="text-sm text-muted">Reading rows…</p>}

        {preview.length > 0 && (
          <div className="max-h-48 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-muted/40">
                <tr>
                  <th className="px-2 py-1">Unit</th>
                  <th className="px-2 py-1">Tenant</th>
                  <th className="px-2 py-1">Rent</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 20).map((row) => (
                  <tr key={row.unitCode} className="border-t border-border">
                    <td className="px-2 py-1 font-medium">{row.unitCode}</td>
                    <td className="px-2 py-1">{row.tenantName ?? "—"}</td>
                    <td className="px-2 py-1">
                      {row.annualRent ? formatNaira(row.annualRent) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 20 && (
              <p className="px-2 py-1 text-[11px] text-muted">
                + {preview.length - 20} more units
              </p>
            )}
          </div>
        )}

        <LoadingButton
          type="submit"
          loading={pending}
          disabled={!csvText.trim() || preview.length === 0}
          className="btn-primary w-full"
        >
          Import {preview.length || ""} units
        </LoadingButton>
      </form>
    </FormPanel>
  );
}
