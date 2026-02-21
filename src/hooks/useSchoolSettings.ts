"use client";

import { useState, useEffect } from "react";

export type SchoolSettingsState = {
  name: string;
  address: string;
  logoUrl: string | null;
  principalSignatureUrl: string | null;
  loading: boolean;
};

const defaults: SchoolSettingsState = {
  name: "School",
  address: "",
  logoUrl: null,
  principalSignatureUrl: null,
  loading: true,
};

export function useSchoolSettings(): SchoolSettingsState {
  const [state, setState] = useState<SchoolSettingsState>(defaults);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch("/api/school-settings")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setState({
          name: data.name ?? "School",
          address: data.address ?? "",
          logoUrl: data.logoUrl ?? null,
          principalSignatureUrl: data.principalSignatureUrl ?? null,
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ ...defaults, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
